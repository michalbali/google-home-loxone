import { homegraph_v1, auth } from '@googleapis/homegraph';
import {
    SmartHomeV1ExecuteErrors,
    SmartHomeV1ExecuteRequestCommands,
    SmartHomeV1ExecuteRequestPayload,
    SmartHomeV1ExecuteResponse,
    SmartHomeV1ExecuteResponseCommands,
    SmartHomeV1ExecuteStatus,
    SmartHomeV1QueryRequestPayload,
    SmartHomeV1QueryResponse,
    SmartHomeV1SyncResponse
} from './smarthome/api.model';
import { Request } from 'express-serve-static-core';
import { from, interval, Observable, of } from 'rxjs';
import { buffer, catchError, filter, map, mergeMap, tap, toArray } from 'rxjs/operators';
import { Handlers } from './capabilities/capability-handler';
import { Component } from './components/component';
import { ComponentsFactory } from './components/components.factory';
import { Config } from './config';
import { Log } from './log';
import { ErrorType } from './error';

const uuid = require('uuid');

export class GoogleSmartHome {
    private readonly config: Config;
    private readonly jwtConfig: string;
    private readonly jwtPath: string;
    private readonly components: ComponentsFactory;
    private readonly statesEvents: Observable<Component>;
    private readonly handlers: Handlers;

    constructor(config: Config, components: ComponentsFactory, statesEvents: Observable<Component>, jwtConfig: string, jwtPath: string) {

        this.config = config;
        this.jwtConfig = jwtConfig;
        this.jwtPath = jwtPath;
        this.handlers = new Handlers();
        this.components = components;
        this.statesEvents = statesEvents;
    }

    init(): Observable<any> {
        // Wait for loxone autodetection before sync
        return this.components.init()
            .pipe(
                tap(async () => {
                    // Init Homegraph API
                    const gAuth = new auth.GoogleAuth({ keyFile: this.jwtPath, scopes: ['https://www.googleapis.com/auth/homegraph'] });
                    const homegraph = new homegraph_v1.Homegraph({ apiVersion: 'v1', auth: gAuth });
                    if (!this.config.testMode) {
                        const requestBody = { agentUserId: this.config.agentUserId, async: true };
                        Log.info("Calling requestSync:", JSON.stringify(requestBody));
                        // Using this call synchronously seem fail (Err 500 from Google API).
                        await homegraph.devices.requestSync({ requestBody });
                    }

                    // Listening for loxone devices events
                    this.subscribeStates(this.statesEvents).subscribe({
                        next: (states) => {
                            Log.info('Reporting states:', JSON.stringify(states?.payload?.devices?.states));
                            if (!this.config.testMode) {
                                homegraph.devices.reportStateAndNotification({ requestBody: states })
                            }
                        }
                    });
                })
            );
    }

    subscribeStates(statesEvents: Observable<Component>): Observable<any> {
        return statesEvents.pipe(
            buffer(interval(1000)),
            filter(componentsStates => componentsStates.length > 0),
            mergeMap(componentsStates => {
                return from(componentsStates).pipe(
                    mergeMap(component => component.getStates().pipe(map(state => {
                        const response = {};
                        response[component.id] = state;
                        return response
                    }))),
                    toArray(),
                    map(result => {
                        const states = result.reduce((acc, cur) => {
                            return Object.assign({}, acc, cur);
                        }, {});

                        return {
                            requestId: uuid.v4(),
                            agentUserId: this.config.agentUserId,
                            payload: {
                                devices: {
                                    states
                                }
                            }
                        }
                    }))
            })
        );
    }

    handler(data: any, request: Request): Observable<any> {
        const input = data.inputs[0];
        const intent = input.intent;

        if (!intent) {
            return of({
                errorCode: 'notSupported'
            })
        }

        switch (intent) {
            case 'action.devices.SYNC':
                return this.sync(data.requestId);
            case 'action.devices.QUERY':
                return this.query(input.payload, data.requestId);
            case 'action.devices.EXECUTE':
                return this.exec(input.payload, data.requestId);
            case 'action.devices.DISCONNECT':
                // TODO
                return of({});
            default:
                return of({
                    errorCode: 'notSupported'
                });
        }
    }

    sync(requestId: string): Observable<SmartHomeV1SyncResponse> {
        const devices = Object.values(this.components.getComponent())
            .map(component => component.getSync());

        return of({
            requestId: requestId,
            payload: {
                agentUserId: this.config.agentUserId,
                devices: devices
            }
        });
    }

    // Retrieve states of multiple devices
    query(request: SmartHomeV1QueryRequestPayload, requestId: string): Observable<SmartHomeV1QueryResponse> {
        // We iterate trough devices
        return from(request.devices).pipe(
            mergeMap(device => {
                // Check if we have the device in factory
                if (!this.components.getComponent().hasOwnProperty(device.id)) {
                    return of({
                        id: device.id,
                        errorCode: 'deviceNotFound' as SmartHomeV1ExecuteErrors
                    }) as any;
                }

                return this.components.getComponent()[device.id].getStates().pipe(
                    map(states => {
                        return {
                            id: device.id,
                            states: states
                        } as any;
                    })
                );
            }),
            toArray(),
            map(result => {
                const devices = result.reduce((acc, cur) => {
                    if (cur['states']) {
                        acc[cur['id']] = cur['states'];
                    }
                    if (cur['errorCode']) {
                        acc[cur['id']] = {
                            'errorCode': cur['errorCode']
                        }
                    } 
                    //else if no status is returned, we assume it's a success
                    else if (!acc[cur['id']].status) {
                        acc[cur['id']].status = 'SUCCESS' as SmartHomeV1ExecuteStatus                        
                    }
                    return acc;
                }, {});

                return {
                    requestId: requestId,
                    payload: {
                        devices: devices
                    }
                } as SmartHomeV1QueryResponse
            })
        );
    }

    exec(request: SmartHomeV1ExecuteRequestPayload, requestId: string): Observable<SmartHomeV1ExecuteResponse> {
        return from(request.commands).pipe(
            mergeMap(command => this.handleCommand(command)),
            toArray(),
            map((result: SmartHomeV1ExecuteResponseCommands[]) => {
                return {
                    requestId: requestId,
                    payload: {
                        commands: result
                    }
                }
            })
        )
    }

    handleCommand(command: SmartHomeV1ExecuteRequestCommands): Observable<SmartHomeV1ExecuteResponseCommands> {
        // Iterate trough devices
        return from(command.devices).pipe(
            mergeMap(device => {
                // Check if we have the device in factory
                if (!this.components.getComponent().hasOwnProperty(device.id)) {
                    return of({
                        ids: [device.id],
                        status: 'ERROR' as SmartHomeV1ExecuteStatus,
                        errorCode: 'deviceNotFound' as SmartHomeV1ExecuteErrors
                    } as SmartHomeV1ExecuteResponseCommands);
                }

                const component = this.components.getComponent()[device.id];
                if (this.config.log) {
                    Log.info('Component found');
                }

                // Now execute all command into the device
                return from(command.execution).pipe(
                    mergeMap(execution => {
                        const componentHandler = this.handlers.getHandler(execution.command);
                
                        if (componentHandler === undefined) {
                            // If we can't found the device, return ERROR
                            return of(CommandResult.ERROR);
                        }
                
                        return componentHandler.handleCommands(component, execution.command, execution.params, execution.challenge).pipe(
                            map(result => result ? CommandResult.SUCCESS : CommandResult.ERROR)                            
                        );
                    }),
                    catchError((err) => {
                        if (err.message === ErrorType.CHALLENGE_NEEDED_ACK) {
                            return of(CommandResult.ERROR_NEED_ACK);
                        } else {
                            Log.error('ERROR', err);
                            return of(CommandResult.ERROR);
                        }
                    }),
                    mergeMap((result: CommandResult) => {
                        if (result === CommandResult.ERROR_NEED_ACK) {
                            return of({
                                ids: [device.id],
                                status: 'ERROR' as SmartHomeV1ExecuteStatus,
                                errorCode: 'challengeNeeded' as SmartHomeV1ExecuteErrors,
                                challengeNeeded: {
                                    type: 'ackNeeded'
                                }
                            } as SmartHomeV1ExecuteResponseCommands);
                        }
                
                        if (result === CommandResult.ERROR) {
                            return of({
                                ids: [device.id],
                                status: 'ERROR' as SmartHomeV1ExecuteStatus,
                                errorCode: 'notSupported' as SmartHomeV1ExecuteErrors
                            } as SmartHomeV1ExecuteResponseCommands);
                        }
                
                        // Call state on component and merge them
                        return component.getStates().pipe(
                            map(states => {
                                return {
                                    ids: [device.id],
                                    status: 'SUCCESS' as SmartHomeV1ExecuteStatus,
                                    states: states
                                } as SmartHomeV1ExecuteResponseCommands;
                            })
                        );
                    })
                )
            })
        )
    }
}

enum CommandResult {
    SUCCESS,
    ERROR,
    ERROR_NEED_ACK
}

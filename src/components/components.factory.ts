import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ComponentRaw, Config } from '../config';
import { LoxoneRequest } from '../loxone-request';
import { BlindComponent } from './blind';
import { Component } from './component';
import { LightComponent } from './light';
import { SwitchComponent } from './switch';
import { TemperatureComponent } from './temperature';
import { AirCoolerComponent } from './air-cooler';
import { Log } from '../log';
import { LightComponentV2 } from './lightV2';
import { BoilerComponent } from './boiler';
import { GateComponent } from './gate';
import { raw } from 'express';
import { GarageComponent } from './garage';
import { DoorWithAutoLockComponent } from './doorWithAutoLock';

export class ComponentsFactory {
    private components: { [key: string]: Component } = {};
    private config: Config;
    private loxoneRequest: LoxoneRequest;
    private statesEvents: Subject<Component>;

    constructor(config: Config, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>) {
        this.config = config;
        this.loxoneRequest = loxoneRequest;
        this.statesEvents = statesEvents;
    }

    init(): Observable<{ [key: string]: Component }> {
        return this.loxoneRequest.sync().pipe(
            map((body: any) => {
                for (const controlId in body.controls) {
                    if (!body.controls.hasOwnProperty(controlId)) {
                        continue;
                    }

                    const control = body?.controls[controlId]
                    const roomId = control?.room;
                    const rawComponent: ComponentRaw = {
                        id: controlId,
                        loxoneType: control?.type,
                        name: control?.name,
                        room: roomId ? body.rooms[roomId]?.name : 'Unknow'
                    };

                    let component: Component;
                    switch (rawComponent.loxoneType) {
                        case 'Pushbutton':
                            component = new DoorWithAutoLockComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        case 'Gate':
                            if (rawComponent.name === 'Garage') {
                                component = new GarageComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                                break;
                            }
                            component = new GateComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        case 'InfoOnlyAnalog':
                            if (rawComponent.name === 'Boiler') {
                                component = new BoilerComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            }
                            break;
                        case 'LightControllerV2':
                            component = new LightComponentV2(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        case 'Switch':
                            component = new SwitchComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        case 'EIBDimmer':
                            component = new LightComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        case 'Dimmer':
                            component = new LightComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        case 'Jalousie':
                            component = new BlindComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        case 'IRoomControllerV2':
                            component = new TemperatureComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        case 'AcControl':
                            component = new AirCoolerComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                            break;
                        // case 'WindowMonitor':
                        //     component = new OpenCloseSensorComponent(rawComponent, this.loxoneRequest, this.statesEvents);
                        //     break;

                        default:
                            if (this.config.log) {
                                Log.info(`Type [${rawComponent.loxoneType}] not yet supported`);
                            }
                    }

                    if (component != null) {
                        this.components[component.id] = component;
                    }

                }

                return this.components;
            })
        );
    }

    getComponent(): { [key: string]: Component } {
        return this.components;
    }
}

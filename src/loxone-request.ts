import { Axios } from 'axios-observable';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Config } from './config';
import { Log } from './log';

const LoxoneWebSocket = require('node-lox-ws-api');

export class LoxoneRequest {
    private socket: any;
    private structureFile: any;
    private commandChain = [];
    private structureSubject: Subject<any>;
    private config: Config;

    constructor(config: Config) {
        this.config = config;
        // Note : Loxone WS doesn't allow WSS connection.
        this.socket = new LoxoneWebSocket(config.loxone.url, config.loxone.user, config.loxone.password, true);
        this.connect();

        this.structureSubject = new Subject<any>();

        this.socket.on('get_structure_file', (data) => {
            this.structureFile = data;
            this.structureSubject.next(data);
            this.structureSubject.complete();
        });
    }

    connect() {
        Log.info("Calling WS socket connect");
        this.socket.connect();
        
        // this.socket.on(`update_event_value`, (event) => {
        //     Log.info('update_event_value:', JSON.stringify(event, null, 2));
        // });

        this.socket.on('connect_failed', () => {
            Log.error('Connection to Loxone failed');
        });
        
        this.socket.on('connection_error', () => {
            Log.error('Connection to Loxone errored');
        });

        this.socket.on('close', (info, reason) => {
            Log.error('Connection to Loxone closed', info, reason);
        });

        //listen for command responses
        this.socket.on('message_text', (message) => {
            for (let index = this.commandChain.length - 1; index >= 0; index--) {
                const item = this.commandChain[index];
                if (item.control === message.control) {
                    item.callback(message);
                    this.commandChain.splice(index, 1);
                    break;
                }
            }
        })
    }

    sync(): Observable<any> {
        const url = `${this.config.loxone.protocol}://${this.config.loxone.url}/data/LoxApp3.json`;
        if (this.config.log) {
            Log.info('Loxone autodiscover on ', url);
        }

        return Axios.post(url, null, {
            auth: {
                username: this.config.loxone.user,
                password: this.config.loxone.password
            }
        }).pipe(
            map((resp) => resp.data),
            catchError(err => {
                Log.error('Error while requesting Loxone component', err);
                throw 'Error while requesting Loxone component';
            })
        );
    }

    watchComponent(uuid: string): Observable<any> {
        const events = new Subject<any>();

        this.socket.on(`update_event_value_${uuid}`, (state) => {
            events.next(state);
        });

        return events;
    }

    watchComponentText(uuid: string): Observable<any> {
        const events = new Subject<any>();

        this.socket.on('update_event_text', (eventUuid, state) => {
            if (uuid === eventUuid) {
                events.next(state);
            }
        });

        return events;
    }

    sendCmd(uuidAction: string, state: string): Observable<any> {
        // Do not send command in test mode
        if (this.config.testMode) {
            return of({
                code: '200',
            });
        }

        const events = new Subject<any>();

        // const commandEdited = this.socket._auth.prepare_control_command(uuidAction, state);
        const commandEdited = `jdev/sps/io/${uuidAction}/${state}`;

        this.commandChain.push({
            'control': `dev/sps/io/${uuidAction}/${state}`,
            'callback': (result) => {
                if (this.config.log) {
                    Log.info("Loxone Response: ", JSON.stringify(result));
                }
                events.next(result);
                events.complete();
            }
        });

        if (this.config.log) {
            Log.info("Loxone Request:", commandEdited);
        }
        this.socket.send_command(commandEdited, false);

        this.postProcessHook(commandEdited);

        return events;
    }

    private postProcessHook(command: string) {
        if (this.config.postProcessHooks === undefined) {
            return;
        }

        if (this.config.postProcessHooks[command] === undefined) {
            return;
        }

        Log.info(`Post process hook detected for ${command} sending ${this.config.postProcessHooks[command]}`);
        this.socket.send_command(this.config.postProcessHooks[command], false);
    }

    getControlInformation(uuid: string): Observable<any> {
        return this.getStructureFile().pipe(map(structure => {
            if (structure['controls'][uuid] === undefined) {
                Log.warn(`This component ${uuid} don\'t exist in Loxone`);
                return;
            }
            return structure['controls'][uuid];
        }))
    }

    getStructureFile(): Observable<any> {
        if (this.structureFile !== undefined) {
            return of(this.structureFile);
        }
        return this.structureSubject;
    }

    //emit method only for testing
    private emit(event: string, ...args: any[]) {
        this.socket.emit(event, ...args);
    }
}

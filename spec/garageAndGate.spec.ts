import { Axios } from 'axios-observable';
import nock from 'nock';
import { map } from 'rxjs/operators';
import { Server } from '../src/server';
import { LoxoneRequest } from '../src/loxone-request';
import jasmine from 'jasmine';

const config = require('./support/config_test.json');
const loxoneDiscoverResponse = require('./responses/loxone-discover.json');
let app;

//tests with multiple devices
describe('Garage and Gate', () => {
    let sendCmdSpy: jasmine.Spy;

    beforeAll((done: DoneFn) => {
        const url = `${config.loxone.protocol}://${config.loxone.url}`;

        sendCmdSpy = spyOn(LoxoneRequest.prototype, 'sendCmd').and.callThrough();

        nock(url)
            .post('/data/LoxApp3.json')
            .reply(200, loxoneDiscoverResponse);

        app = new Server({
            jwt: __dirname + '/support/jwt.json',
            config: __dirname + '/support/config_test.json',
            port: 3000,
        }, done);
    });

    beforeEach(() => {
        sendCmdSpy.calls.reset();
    });

    afterAll((done) => {
        app?.server?.close(done);
    });

    it('should request the status of garage and gate', (done: DoneFn) => {        
        initializeClosedGateAndGarage();

        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.QUERY',
                payload: {
                    devices: [
                        {
                            id: '0acbb406-02fb-598c-ffff112233445566'
                        },
                        {
                            id: '0ad31251-030a-c43a-ffff112233445566'
                        }
                    ]
                }
            }]
        }, {
            headers: {
                Authorization: 'Bearer access-token-from-skill',
            }
        })
            .pipe(map((resp: any) => resp.data))
            .subscribe((resp) => {
                expect(resp.payload.devices['0acbb406-02fb-598c-ffff112233445566'].online).toBeTruthy();
                expect(resp.payload.devices['0acbb406-02fb-598c-ffff112233445566'].status).toEqual('SUCCESS');
                expect(resp.payload.devices['0acbb406-02fb-598c-ffff112233445566'].openPercent).toEqual(0);

                expect(resp.payload.devices['0ad31251-030a-c43a-ffff112233445566'].online).toBeTruthy();
                expect(resp.payload.devices['0ad31251-030a-c43a-ffff112233445566'].status).toEqual('SUCCESS');
                expect(resp.payload.devices['0ad31251-030a-c43a-ffff112233445566'].openPercent).toEqual(0);
                done();
            });
    });

    it('should NOT open garage without acknowledgement, only gate', (done: DoneFn) => {        
        initializeClosedGateAndGarage();
        
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '0acbb406-02fb-598c-ffff112233445566'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OpenClose',
                            params: {
                                openPercent: 100
                            }
                        }]
                    }, {
                        devices: [{
                            id: '0ad31251-030a-c43a-ffff112233445566'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OpenClose',
                            params: {
                                openPercent: 100
                            }
                        }]
                    }]
                }
            }]
        }, {
            headers: {
                Authorization: 'Bearer access-token-from-skill',
            }
        })
            .pipe(map((resp: any) => resp.data))
            .subscribe((resp) => {                
                expect(resp.payload.commands[0].status).toEqual('ERROR');
                expect(resp.payload.commands[0].errorCode).toEqual('challengeNeeded');
                expect(resp.payload.commands[0].challengeNeeded.type).toEqual('ackNeeded');

                expect(sendCmdSpy).toHaveBeenCalledWith('0ad31251-030a-c43a-ffff112233445566', 'open');
                expect(resp.payload.commands[1].states.online).toBeTruthy();
                expect(resp.payload.commands[1].states.openPercent).toEqual(100);
                done();
            });
    });

    it('should open gate and garage after acknowledgement', (done: DoneFn) => {
        initializeClosedGateAndGarage();

        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '0acbb406-02fb-598c-ffff112233445566'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OpenClose',
                            params: {
                                openPercent: 100
                            },
                            challenge: {
                                ack: true
                            }
                        }]
                    }, {
                        devices: [{
                            id: '0ad31251-030a-c43a-ffff112233445566'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OpenClose',
                            params: {
                                openPercent: 100
                            }
                        }]
                    }]
                }
            }]
        }, {
            headers: {
                Authorization: 'Bearer access-token-from-skill',
            }
        })
            .pipe(map((resp: any) => resp.data))
            .subscribe((resp) => {
                expect(sendCmdSpy).toHaveBeenCalledWith('0acbb406-02fb-598c-ffff112233445566', 'open');
                expect(resp.payload.commands[0].status).toEqual('SUCCESS');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.openPercent).toEqual(100);
                
                expect(sendCmdSpy).toHaveBeenCalledWith('0ad31251-030a-c43a-ffff112233445566', 'open');
                expect(resp.payload.commands[1].status).toEqual('SUCCESS');
                expect(resp.payload.commands[1].states.online).toBeTruthy();
                expect(resp.payload.commands[1].states.openPercent).toEqual(100);
                done();
            });
    });

    it('should close garage and gate', (done: DoneFn) => {
        initializeOpenedGateAndGarage();
        
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '0acbb406-02fb-598c-ffff112233445566'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OpenClose',
                            params: {
                                openPercent: 0
                            }
                        }]
                    }, {
                        devices: [{
                            id: '0ad31251-030a-c43a-ffff112233445566'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OpenClose',
                            params: {
                                openPercent: 0
                            }
                        }]
                    }]
                }
            }]
        }, {
            headers: {
                Authorization: 'Bearer access-token-from-skill',
            }
        })
            .pipe(map((resp: any) => resp.data))
            .subscribe((resp) => {
                expect(sendCmdSpy).toHaveBeenCalledWith('0acbb406-02fb-598c-ffff112233445566', 'close');
                expect(resp.payload.commands[0].status).toEqual('SUCCESS');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.openPercent).toEqual(0);

                expect(sendCmdSpy).toHaveBeenCalledWith('0ad31251-030a-c43a-ffff112233445566', 'close');
                expect(resp.payload.commands[1].status).toEqual('SUCCESS');
                expect(resp.payload.commands[1].states.online).toBeTruthy();
                expect(resp.payload.commands[1].states.openPercent).toEqual(0);
                done();
            });
    });

});

function initializeOpenedGateAndGarage() {
    app.loxoneRequest.emit('get_structure_file', loxoneDiscoverResponse);
    //initialize open garage
    app.loxoneRequest.emit('update_event_value_0acbb406-02fb-598a-ffff112233445566', 1);
    //initialize open gate
    app.loxoneRequest.emit('update_event_value_0ad31251-030a-c438-ffff112233445566', 1);
}

function initializeClosedGateAndGarage() {
    app.loxoneRequest.emit('get_structure_file', loxoneDiscoverResponse);
    app.loxoneRequest.emit('update_event_value_0acbb406-02fb-598a-ffff112233445566', 0);
    app.loxoneRequest.emit('update_event_value_0ad31251-030a-c438-ffff112233445566', 0);
}


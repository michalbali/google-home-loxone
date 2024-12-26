import { Axios } from 'axios-observable';
import nock from 'nock';
import { map } from 'rxjs/operators';
import { Server } from '../src/server';
import { LoxoneRequest } from '../src/loxone-request';
import jasmine from 'jasmine';

const config = require('./support/config_test.json');
const loxoneDiscoverResponse = require('./responses/loxone-discover.json');
let app;

describe('Jalousie', () => {
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

    afterAll((done) => {
        app?.server?.close(done);
    });

    it('should request the status of a jalousie', (done: DoneFn) => {
        app.loxoneRequest.emit('get_structure_file', loxoneDiscoverResponse);
        app.loxoneRequest.emit('update_event_value_11f4e162-010a-4577-ffffcb7e425338b2', 0.4);
        app.loxoneRequest.emit('update_event_value_11f4e162-010a-4578-ffffcb7e425338b2', 0);
        
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.QUERY',
                payload: {
                    devices: [
                        {
                            id: '11f4e162-010a-457d-ffff0be037a23d47'
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
                expect(resp.payload.devices['11f4e162-010a-457d-ffff0be037a23d47'].online).toBeTruthy();
                expect(resp.payload.devices['11f4e162-010a-457d-ffff0be037a23d47'].status).toEqual('SUCCESS');
                expect(resp.payload.devices['11f4e162-010a-457d-ffff0be037a23d47'].openPercent).toEqual(60);
                expect(resp.payload.devices['11f4e162-010a-457d-ffff0be037a23d47'].rotationPercent).toEqual(100);
                done();
            });
    });

    it('should open a jalousie', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '11f4e162-010a-457d-ffff0be037a23d47'
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
                expect(sendCmdSpy).toHaveBeenCalledWith('11f4e162-010a-457d-ffff0be037a23d47', 'FullUp');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.openPercent).toEqual(100);
                // expect(resp.payload.commands[0].states.openDirection).toEqual('UP');
                done();
            });
    });

    it('should close a jalousie', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '11f4e162-010a-457d-ffff0be037a23d47'
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
                expect(sendCmdSpy).toHaveBeenCalledWith('11f4e162-010a-457d-ffff0be037a23d47', 'FullDown');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.openPercent).toEqual(0);
                // expect(resp.payload.commands[0].states.openDirection).toEqual('DOWN');
                done();
            });
    });

    it('should reposition a jalousie', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '11f4e162-010a-457d-ffff0be037a23d47'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OpenClose',
                            params: {
                                openPercent: 40
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
                expect(sendCmdSpy).toHaveBeenCalledWith('11f4e162-010a-457d-ffff0be037a23d47', 'ManualPosition/60');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.openPercent).toEqual(40);
                // expect(resp.payload.commands[0].states.openDirection).toEqual('DOWN');
                done();
            });
    });

    // it('should open jalousie by 5%', (done: DoneFn) => {
    //     //call LoxoneRequest.socket.emit('sendCmd', '11f4e162-010a-457d-ffff0be037a23d47', 'ManualPosition/5');


    //     Axios.post(`http://localhost:3000/smarthome`, {
    //         requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
    //         inputs: [{
    //             intent: 'action.devices.EXECUTE',
    //             payload: {
    //                 commands: [{
    //                     devices: [{
    //                         id: '11f4e162-010a-457d-ffff0be037a23d47'
    //                     }],
    //                     execution: [{
    //                         command: 'action.devices.commands.OpenCloseRelative',
    //                         params: {
    //                             openRelativePercent: 5
    //                         }
    //                     }]
    //                 }]
    //             }
    //         }]
    //     }, {
    //         headers: {
    //             Authorization: 'Bearer access-token-from-skill',
    //         }
    //     })
    //         .pipe(map((resp: any) => resp.data))
    //         .subscribe((resp) => {
    //             expect(sendCmdSpy).toHaveBeenCalledWith('11f4e162-010a-457d-ffff0be037a23d47', 'ManualPosition/5');
    //             expect(resp.payload.commands[0].states.online).toBeTruthy();
    //             // expect(resp.payload.commands[0].states.openPercent).toEqual(5);
    //             // expect(resp.payload.commands[0].states.openDirection).toEqual('DOWN');
    //             done();
    //         });
    // });

    it('should rotate jalousie - close', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '11f4e162-010a-457d-ffff0be037a23d47'
                        }],
                        execution: [{
                            command: 'action.devices.commands.RotateAbsolute',
                            params: {
                                rotationPercent: 0
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
                expect(sendCmdSpy).toHaveBeenCalledWith('11f4e162-010a-457d-ffff0be037a23d47', 'ManualLamelle/100');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.rotationPercent).toEqual(0);
                done();
            });
    });

    it('should rotate jalousie - open', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '11f4e162-010a-457d-ffff0be037a23d47'
                        }],
                        execution: [{
                            command: 'action.devices.commands.RotateAbsolute',
                            params: {
                                rotationPercent: 100
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
                expect(sendCmdSpy).toHaveBeenCalledWith('11f4e162-010a-457d-ffff0be037a23d47', 'ManualLamelle/0');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.rotationPercent).toEqual(100);
                done();
            });
    });

});

import { Axios } from 'axios-observable';
import nock from 'nock';
import { map } from 'rxjs/operators';
import { Server } from '../src/server';
import { LoxoneRequest } from '../src/loxone-request';
import jasmine from 'jasmine';

const config = require('./support/config_test.json');
const loxoneDiscoverResponse = require('./responses/loxone-discover.json');
let app;

describe('DoorWithAutoLockComponent', () => {
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

    it('should request the status of door with automatic lock', (done: DoneFn) => {        
        app.loxoneRequest.emit('get_structure_file', loxoneDiscoverResponse);
        app.loxoneRequest.emit('update_event_value_0e5a38f0-0025-f772-ffff112233445566', 0);

        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.QUERY',
                payload: {
                    devices: [
                        {
                            id: '0e5a38f0-0025-f772-ffff112233445566'
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
                expect(resp.payload.devices['0e5a38f0-0025-f772-ffff112233445566'].online).toBeTruthy();
                expect(resp.payload.devices['0e5a38f0-0025-f772-ffff112233445566'].status).toEqual('SUCCESS');
                expect(resp.payload.devices['0e5a38f0-0025-f772-ffff112233445566'].openPercent).toEqual(0);
                done();
            });
    });

    it('should open a door with automatic lock', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '0e5a38f0-0025-f772-ffff112233445566'
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
                expect(sendCmdSpy).toHaveBeenCalledWith('0e5a38f0-0025-f772-ffff112233445566', 'pulse');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                //should report closed
                expect(resp.payload.commands[0].states.openPercent).toEqual(0);
                done();
            });
    });

    it('should close a door with automatic lock', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '0e5a38f0-0025-f772-ffff112233445566'
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
                expect(sendCmdSpy).not.toHaveBeenCalled();
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.openPercent).toEqual(0);
                done();
            });
    });

});
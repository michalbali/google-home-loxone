import { Axios } from 'axios-observable';
import nock from 'nock';
import { map } from 'rxjs/operators';
import { Server } from '../src/server';
import jasmine from 'jasmine';
import { Log } from '../src/log';
import { LoxoneRequest } from '../src/loxone-request';

const config = require('./support/config_test.json');
const loxoneDiscoverResponse = require('./responses/loxone-discover.json');
let app;

describe('LightV2', () => {
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

    it('should request the status of a light', (done: DoneFn) => {
        app.loxoneRequest.emit('get_structure_file', loxoneDiscoverResponse);
        app.loxoneRequest.emit('update_event_text', '1171133c-025d-1858-ffff504f941036f8', '[778]');
        
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.QUERY',
                payload: {
                    devices: [
                        {
                            id: '10c081b6-026b-58cc-ffff112233445566'
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
                expect(resp.payload.devices['10c081b6-026b-58cc-ffff112233445566'].online).toBeTrue();
                expect(resp.payload.devices['10c081b6-026b-58cc-ffff112233445566'].status).toEqual('SUCCESS');
                expect(resp.payload.devices['10c081b6-026b-58cc-ffff112233445566'].on).toBeFalse();
                done();
            });
    });
   
    it('should turn on a light', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '10c081b6-026b-58cc-ffff112233445566'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OnOff',
                            params: {
                                on: true
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
                expect(sendCmdSpy).toHaveBeenCalledWith('10c081b6-026b-58cc-ffff112233445566', 'changeTo/1');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.on).toBeTruthy();
                done();
            });
    });

    it('should turn off a light', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
            inputs: [{
                intent: 'action.devices.EXECUTE',
                payload: {
                    commands: [{
                        devices: [{
                            id: '10c081b6-026b-58cc-ffff112233445566'
                        }],
                        execution: [{
                            command: 'action.devices.commands.OnOff',
                            params: {
                                on: false
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
                expect(sendCmdSpy).toHaveBeenCalledWith('10c081b6-026b-58cc-ffff112233445566', 'changeTo/778');
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.on).toBeFalse();
                done();
            });
    });
    
});

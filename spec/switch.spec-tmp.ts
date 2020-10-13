import { RxHR } from '@akanass/rx-http-request';
import nock from 'nock';
import { map } from 'rxjs/operators';
import { Server } from '../src/server';

const config = require('./support/config_test.json');
const loxoneDiscoverResponse = require('./responses/loxone-discover.json');
let app = null;

describe('Swtich', () => {
    beforeAll((done: DoneFn) => {
        const url = `http://${config.loxone.url}`;

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

    it('should request the status of a switch', (done: DoneFn) => {
        RxHR.post(`http://localhost:3000/smarthome`, {
            json: true,
            headers: {
                Authorization: 'Bearer access-token-from-skill',
            },
            body: {
                requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
                inputs: [{
                    intent: 'action.devices.QUERY',
                    payload: {
                        devices: [
                            {
                                id: '10f5096d-0338-13c2-ffffd75a488e408a'
                            }
                        ]
                    }
                }]
            }
        })
            .pipe(map((resp: any) => resp.body))
            .subscribe((resp) => {
                expect(resp.payload.devices['10f5096d-0338-13c2-ffffd75a488e408a'].online).toBeTruthy();
                // TODO : Test status on / off
                done();
            });
    });

    it('should turn on a switch', (done: DoneFn) => {
        RxHR.post(`http://localhost:3000/smarthome`, {
            json: true,
            headers: {
                Authorization: 'Bearer access-token-from-skill',
            },
            body: {
                requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
                inputs: [{
                    intent: 'action.devices.EXECUTE',
                    payload: {
                        commands: [{
                            devices: [{
                                id: '10f5096d-0338-13c2-ffffd75a488e408a'
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
            }
        })
            .pipe(map((resp: any) => resp.body))
            .subscribe((resp) => {
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.on).toBeTruthy();
                done();
            });
    });

    it('should turn off a switch', (done: DoneFn) => {
        RxHR.post(`http://localhost:3000/smarthome`, {
            json: true,
            headers: {
                Authorization: 'Bearer access-token-from-skill',
            },
            body: {
                requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
                inputs: [{
                    intent: 'action.devices.EXECUTE',
                    payload: {
                        commands: [{
                            devices: [{
                                id: '10f5096d-0338-13c2-ffffd75a488e408a'
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
            }
        })
            .pipe(map((resp: any) => resp.body))
            .subscribe((resp) => {
                expect(resp.payload.commands[0].states.online).toBeTruthy();
                expect(resp.payload.commands[0].states.on).toBeFalse();
                done();
            });
    });
});

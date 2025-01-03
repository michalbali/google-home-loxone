import { Axios } from 'axios-observable';
import nock from 'nock';
import { map } from 'rxjs/operators';
import { Server } from '../src/server';

const config = require('./support/config_test.json');
const loxoneDiscoverResponse = require('./responses/loxone-discover.json');
let app;

describe('Sync', () => {
    beforeAll((done: DoneFn) => {
        const url = `${config.loxone.protocol}://${config.loxone.url}`;

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

    it('should display elements', (done: DoneFn) => {
        Axios.post(`http://localhost:3000/smarthome`, {
            requestId: 'ff36a3cc-sync-1',
            inputs: [{
                intent: 'action.devices.SYNC'
            }]
        }, {
            headers: {
                Authorization: 'Bearer access-token-from-skill',
            }
        })
            .pipe(map((resp: any) => resp.data))
            .subscribe((resp) => {
                expect(resp.payload.devices.length).toEqual(12);

                expect(resp.payload.devices[0].id).toEqual('10f5096d-0338-13c2-ffffd75a488e408a');
                expect(resp.payload.devices[0].type).toEqual('action.devices.types.SWITCH');

                expect(resp.payload.devices[1].id).toEqual('11f4e162-010a-457d-ffff0be037a23d47');
                expect(resp.payload.devices[1].type).toEqual('action.devices.types.BLINDS');

                expect(resp.payload.devices[2].id).toEqual('12120c85-004b-4d55-fffffdd4e0772c8f');
                expect(resp.payload.devices[2].type).toEqual('action.devices.types.THERMOSTAT');

                expect(resp.payload.devices[3].id).toEqual('10f4ff00-0155-692f-ffff6322d0f91668');
                expect(resp.payload.devices[3].type).toEqual('action.devices.types.LIGHT');

                expect(resp.payload.devices[4].id).toEqual('10f4ff00-0155-692f-ffff6322d0f91669');
                expect(resp.payload.devices[4].type).toEqual('action.devices.types.LIGHT');

                expect(resp.payload.devices[5].id).toEqual('10f4ff00-0155-692f-ffff6322d0f91670');
                expect(resp.payload.devices[5].type).toEqual('action.devices.types.AIRCOOLER');
                
                expect(resp.payload.devices[6].id).toEqual('10c081b6-026b-58cc-ffff112233445566');
                expect(resp.payload.devices[6].type).toEqual('action.devices.types.LIGHT');
                
                expect(resp.payload.devices[7].id).toEqual('10c081b6-026b-5863-ffff112233445566');
                expect(resp.payload.devices[7].type).toEqual('action.devices.types.LIGHT');

                expect(resp.payload.devices[8].id).toEqual('0ad31251-030a-c43a-ffff112233445566');
                expect(resp.payload.devices[8].type).toEqual('action.devices.types.GATE');

                expect(resp.payload.devices[9].id).toEqual('0acbb406-02fb-598c-ffff112233445566');
                expect(resp.payload.devices[9].type).toEqual('action.devices.types.GARAGE');

                expect(resp.payload.devices[10].id).toEqual('0c17799c-027a-f695-ffff112233445566');
                expect(resp.payload.devices[10].type).toEqual('action.devices.types.BOILER');

                expect(resp.payload.devices[11].id).toEqual('0e5a38f0-0025-f772-ffff112233445566');
                expect(resp.payload.devices[11].type).toEqual('action.devices.types.DOOR');

                done();
            });
    });
});

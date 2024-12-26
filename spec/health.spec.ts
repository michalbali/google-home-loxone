import { Axios } from 'axios-observable';
import nock from 'nock';
import { map } from 'rxjs/operators';
import { Server } from '../src/server';
import jasmine from 'jasmine';
import { Log } from '../src/log';

const config = require('./support/config_test.json');
const loxoneDiscoverResponse = require('./responses/loxone-discover.json');
let app;

describe('LightV2', () => {

    beforeAll((done: DoneFn) => {
        const url = `${config.loxone.protocol}://${config.loxone.url}`;
       
        nock(url)
            .post('/data/LoxApp3.json')
            .reply(200, loxoneDiscoverResponse)

        app = new Server({
            jwt: __dirname + '/support/jwt.json',
            config: __dirname + '/support/config_test.json',
            port: 3000,
        }, done);
    });

    afterAll((done) => {
        app?.server?.close(done);
    });

    it('should return health status', (done: DoneFn) => {
        Axios.get(`http://localhost:3000/health`)
            .subscribe((resp) => {
                expect(resp.status).toBe(200);
                expect(resp.statusText).toBe('OK');
                expect(resp.data).toEqual({ status: 'OK' });
                done();
            });
    });
    
});

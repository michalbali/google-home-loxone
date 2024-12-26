import { Axios } from 'axios-observable';
import nock from 'nock';
import { map } from 'rxjs/operators';
import { Server } from '../src/server';
import jasmine from 'jasmine';
import { Log } from '../src/log';

const config = require('./support/config_test.json');
const loxoneDiscoverResponse = require('./responses/loxone-discover.json');
let app;

describe('Speed', () => {

    it('should be fast', () => {
        expect(true).toBeTruthy();
    });
    
});

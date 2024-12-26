import * as bodyParser from 'body-parser';
import express, { Express, Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { Observable, Subject } from 'rxjs';
import { Component } from './components/component';
import { ComponentsFactory } from './components/components.factory';
import { Config } from './config';
import { GoogleSmartHome } from './google-smart-home';
import { LoxoneRequest } from './loxone-request';
import { Log } from './log';
import { expressjwt, GetVerificationKey, Request as JWTRequest } from "express-jwt";
import jwksRsa from 'jwks-rsa';

// Define custom types for error handling
interface JwtError extends Error {
    name: string;
    status?: number;
    inner?: Error;
}

export class Server {
    public app: Express;
    public server: any;
    private smartHome: GoogleSmartHome;
    private readonly loxoneRequest: LoxoneRequest;

    private readonly config: Config;
    private readonly jwtPath: string;
    private readonly jwtConfig: string;

    constructor(argv: any, callback?: () => any) {
        this.jwtPath = argv.jwt;
        this.jwtConfig = JSON.parse(readFileSync(argv.jwt, 'utf-8'));
        this.config = JSON.parse(readFileSync(argv.config, 'utf-8'));
        this.config.serverPort = argv.port;
        if (argv.verbose || process.env.GHL_VERBOSE === 'true') {
            this.config.log = true;
        }

        const checkJwt = expressjwt({
            // Dynamically provide a signing key based on the kid in the header and the keys from your Auth0 .well-known endpoint.
            secret: jwksRsa.expressJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `${this.config.oAuthUrl}.well-known/jwks.json`,
            }) as GetVerificationKey,
            // Validate the audience and the issuer
            audience: this.config.audience,
            issuer: this.config.oAuthUrl,            
            algorithms: ['RS256']
        }).unless({ path: ["/health"] });

        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true })); 
        this.app.use((req, res, next) => {            
            req['receivedAt'] = Date.now();
            //Log.info('Got request', req.path);
            // Log.info('Handler: Token:', req.headers.authorization?.split(' ')[1]);
            next();
        });       
        this.app.use((req: JWTRequest, res: Response, next: NextFunction) => {
            if (this.isTestModeWithValidToken(req)) {
                next();
            } else {
                checkJwt(req, res, next);
            }
        });
        this.app.use((err: JwtError, req: Request, res: Response, next: NextFunction) => {
            if (err.name === 'UnauthorizedError') {
                Log.warn('Invalid token', err);
                return res.status(401).send({ message: 'Invalid token' });
            }
            err.status = 404;
            next(err);
        });
        //check request.user.sub within this.config.authorizedSubjects
        this.app.use((req: JWTRequest, res: Response, next: NextFunction) => {
            if (this.isTestModeWithValidToken(req) || req.path === '/health' || this.config.authorizedSubjects.includes(req.auth.sub)) {
                next();
            } else {
                Log.warn('Unauthorized request', req.auth.sub);
                return res.status(401).send({ message: 'Unauthorized' });
            }
        });

        const statesEvents = new Subject<Component>();
        this.loxoneRequest = new LoxoneRequest(this.config);
        const components = new ComponentsFactory(this.config, this.loxoneRequest, statesEvents);
        this.smartHome = new GoogleSmartHome(this.config, components, statesEvents, this.jwtConfig, this.jwtPath);

        this.routes();
        this.init(argv.port).subscribe(() => {
            Log.info('Server initialized');
            if (callback) {
                callback();
            }
        });
    }

    private isTestModeWithValidToken(req: Request): boolean {
        return this.config.testMode && req.headers.authorization?.split(' ')[1] === 'access-token-from-skill';
    }

    init(port): Observable<any> {
        return new Observable((subscriber) => {
            this.server = this.app.listen(port, () => {
                Log.info('Smart Home Cloud and App listening at %s:%s', `http://localhost`, port);
                this.smartHome.init().subscribe(() => {
                    Log.info('init sucessfull');
                    subscriber.next();
                    subscriber.complete();
                }, (err) => {
                    Log.error('Error while init', err);
                    subscriber.error(err);
                    subscriber.complete();
                })
            })

        })
    }

    routes() {
        const router = express.Router();

        router.post('/smarthome', (request: Request, response: Response) => {
            const data = request.body;

            if (this.config.log) {
                Log.info('Smarthome request received', JSON.stringify(data));
                // Log.info('Smarthome request received', JSON.stringify(data, null, 4));
            }

            this.smartHome.handler(data, request).subscribe(result => {
                if (this.config.log) {
                    const duration = Date.now() - request['receivedAt'];
                    Log.info(`Took ${duration}ms, sending to Google:`, JSON.stringify(result));
                }
                response.status(200).set({
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }).json(result);
            })
        });

        router.get('/health', (request: Request, response: Response) => {
            Log.info('Health check returning OK');
            response.status(200).json({ status: 'OK' });
        });

        this.app.use(router);
    }
}

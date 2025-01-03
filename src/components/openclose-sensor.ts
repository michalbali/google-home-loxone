import { Observable, of, Subject } from 'rxjs';
import { CapabilityHandler } from '../capabilities/capability-handler';
import { EndpointHealthHandler } from '../capabilities/endpoint-health';
import { OpenClose, OpenCloseAttributes, OpenCloseHandler } from '../capabilities/open-close';
import { ComponentRaw } from '../config';
import { ErrorType } from '../error';
import { LoxoneRequest } from '../loxone-request';
import { Component, ComponentType } from './component';
import { Log } from '../log';

export class OpenCloseSensorComponent extends Component implements OpenClose {
    protected statePos: number;
    protected isOpen: boolean;

    constructor(rawComponent: ComponentRaw, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>) {
        super(rawComponent, ComponentType.SENSOR, loxoneRequest, statesEvents);

        this.loxoneRequest.getControlInformation(this.loxoneId).subscribe(jalousie => {
            this.loxoneRequest.watchComponent(jalousie['states']['numOpen']).subscribe(event => {
                // TODO Listen for open & send event
                Log.info('Watch numOpen of Sensor component', event);
                this.statePos = 100;
                this.isOpen = true;
                this.statesEvents.next(this);
            });

            this.loxoneRequest.watchComponent(jalousie['states']['numClosed']).subscribe(event => {
                // TODO Listen for close & send event
                Log.info('Watch numClosed of Sensor component', event);
                this.statePos = 100;
                this.isOpen = false;
                this.statesEvents.next(this);
            });
        });
    }

    getCapabilities(): CapabilityHandler<any>[] {
        return [
            OpenCloseHandler.INSTANCE,
            EndpointHealthHandler.INSTANCE,
        ];
    }

    open(): Observable<boolean> {
        throw new Error(ErrorType.NOT_SUPPORTED_IN_CURRENT_MODE);
    }

    close(): Observable<boolean> {
        throw new Error(ErrorType.NOT_SUPPORTED_IN_CURRENT_MODE);
    }

    getPosition(): Observable<number> {
        return of(this.statePos);
    }

    getAttributes(): OpenCloseAttributes {
        return {
            openDirection: [
                'IN',
                'OUT'
            ],
            discreteOnlyOpenClose: true,
            queryOnlyOpenClose: true,
        };
    }

    setPosition(percent: number): Observable<boolean> {
        throw new Error(ErrorType.NOT_SUPPORTED_IN_CURRENT_MODE);
    }

    protected stop(): Observable<boolean> {
        throw new Error(ErrorType.NOT_SUPPORTED_IN_CURRENT_MODE);
    }

    isDiscreteOnlyOpenClose(): boolean {
        return true;
    }

    isAcknowledgementNeeded(): boolean {
        return false;
    }
}

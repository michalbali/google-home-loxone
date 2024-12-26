import { Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { CapabilityHandler } from '../capabilities/capability-handler';
import { EndpointHealthHandler } from '../capabilities/endpoint-health';
import { OpenClose, OpenCloseAttributes, OpenCloseHandler } from '../capabilities/open-close';
import { ComponentRaw } from '../config';
import { ErrorType } from '../error';
import { LoxoneRequest } from '../loxone-request';
import { Component, ComponentType } from './component';
import { Log } from '../log';

//in loxone 1 = open and 0 = closed
export class GateComponent extends Component implements OpenClose {
    protected openPercent: number;

    constructor(rawComponent: ComponentRaw, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>, type: ComponentType = ComponentType.GATE) {
        super(rawComponent, type, loxoneRequest, statesEvents);

        this.loxoneRequest.getControlInformation(this.loxoneId).subscribe(gate => {            
            this.loxoneRequest.watchComponent(gate['states']['position']).pipe(
                distinctUntilChanged((prev, curr) => {
                    // Always emit boundary numbers
                    if (curr === 0 || curr === 1) {
                        return false;
                    }
                    // Filter most numbers in between
                    return Math.abs(curr - prev) < 0.2;
                })                
            ).subscribe(event => {
                this.openPercent = event * 100;
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
        return this.loxoneRequest.sendCmd(this.loxoneId, 'open').pipe(
            map(result => {
                if (result.code === '200') {
                    this.openPercent = 100;
                    return true;
                }
                throw new Error(ErrorType.ENDPOINT_UNREACHABLE);
            })
        );
    }

    close(): Observable<boolean> {
        return this.loxoneRequest.sendCmd(this.loxoneId, 'close').pipe(
            map(result => {
                if (result.code === '200') {
                    this.openPercent = 0;
                    return true;
                }
                throw new Error(ErrorType.ENDPOINT_UNREACHABLE);
            })
        );
    }

    getPosition(): Observable<number> {
        return of(this.openPercent);
    }

    setPosition(newOpenPercent: number): Observable<boolean> {
        if (newOpenPercent === 0) {
            return this.close();
        } else if (newOpenPercent === 100) {
            return this.open();
        }
        Log.error('Gate can only be set to 0 or 100 but got newOpenPercent:' + newOpenPercent);
        throw new Error(ErrorType.NOT_SUPPORTED_IN_CURRENT_MODE);
    }

    isDiscreteOnlyOpenClose(): boolean {
        return true;
    }

    isAcknowledgementNeeded(): boolean {
        return false;
    }

    isClosed(): boolean {        
        return this.openPercent === 0 ;
    }

}

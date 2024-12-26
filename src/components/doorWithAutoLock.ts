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
export class DoorWithAutoLockComponent extends Component implements OpenClose {
    protected isOpen: boolean;

    constructor(rawComponent: ComponentRaw, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>, type: ComponentType = ComponentType.DOOR) {
        super(rawComponent, type, loxoneRequest, statesEvents);

        this.loxoneRequest.getControlInformation(this.loxoneId).subscribe(gate => {            
            this.loxoneRequest.watchComponent(gate['states']['active']).subscribe(event => {
                this.isOpen = event === 1;
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
        return this.loxoneRequest.sendCmd(this.loxoneId, 'pulse').pipe(
            map(result => {
                if (result.code === '200') {                    
                    return true;
                }
                throw new Error(ErrorType.ENDPOINT_UNREACHABLE);
            })
        );
    }

    close(): Observable<boolean> {
        return of (true);        
    }

    getPosition(): Observable<number> {
        return of(this.isOpen ? 100 : 0);
    }

    setPosition(newOpenPercent: number): Observable<boolean> {        
        if (newOpenPercent === 100) {
            return this.open();
        }
        Log.error('Door with automatic lock can only be set to 100 but got newOpenPercent:' + newOpenPercent);
        throw new Error(ErrorType.NOT_SUPPORTED_IN_CURRENT_MODE);
    }

    isDiscreteOnlyOpenClose(): boolean {
        return true;
    }

    isAcknowledgementNeeded(): boolean {
        return false;
    }

    isClosed(): boolean {        
        return !this.isOpen;
    }

}

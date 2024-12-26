import { Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { CapabilityHandler } from '../capabilities/capability-handler';
import { EndpointHealthHandler } from '../capabilities/endpoint-health';
import { OpenClose, OpenCloseAttributes, OpenCloseHandler } from '../capabilities/open-close';
import { ComponentRaw } from '../config';
import { ErrorType } from '../error';
import { LoxoneRequest } from '../loxone-request';
import { Component, ComponentType } from './component';
import { Log } from '../log';
import { Rotation, RotationHandler } from '../capabilities/rotation';

export class BlindComponent extends Component implements OpenClose, Rotation {
    protected openPercent: number;
    protected shadePercent: number; //100-fully open, 0-fully closed

    constructor(rawComponent: ComponentRaw, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>) {
        super(rawComponent, ComponentType.BLINDS, loxoneRequest, statesEvents);

        this.loxoneRequest.getControlInformation(this.loxoneId).subscribe(jalousie => {
            this.loxoneRequest.watchComponent(jalousie['states']['position'])
            .pipe(distinctUntilChanged())
            .subscribe(event => {                
                this.openPercent = (1 - event) * 100;
                this.statesEvents.next(this);
            });

            this.loxoneRequest.watchComponent(jalousie['states']['shadePosition'])
            .pipe(distinctUntilChanged())
            .subscribe(event => {
                this.shadePercent = (1 - event) * 100;
                this.statesEvents.next(this);
            });
        });
    }

    getCapabilities(): CapabilityHandler<any>[] {
        return [
            OpenCloseHandler.INSTANCE,
            RotationHandler.INSTANCE,
            EndpointHealthHandler.INSTANCE,
        ];
    }

    open(): Observable<boolean> {
        return this.loxoneRequest.sendCmd(this.loxoneId, 'FullUp').pipe(
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
        return this.loxoneRequest.sendCmd(this.loxoneId, 'FullDown').pipe(
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

    getShadePosition(): Observable<number> {
        return of(this.shadePercent);
    }

    setPosition(newOpenPercent: number): Observable<boolean> {
        return this.loxoneRequest.sendCmd(this.loxoneId, `ManualPosition/${100 - newOpenPercent}`).pipe(
            map(result => {
                if (result.code === '200') {
                    this.openPercent = newOpenPercent;
                    return true;
                }
                throw new Error(ErrorType.ENDPOINT_UNREACHABLE);
            })
        );
    }

    setShadePosition(newShadePercent: number): Observable<boolean> {
        return this.loxoneRequest.sendCmd(this.loxoneId, `ManualLamelle/${100 - newShadePercent}`).pipe(
            map(result => {
                if (result.code === '200') {
                    this.shadePercent = newShadePercent;
                    return true;
                }
                throw new Error(ErrorType.ENDPOINT_UNREACHABLE);
            })
        );
    }

    protected stop(): Observable<boolean> {
        return this.loxoneRequest.sendCmd(this.loxoneId, 'stop').pipe(map(result => {
            if (result.code === '200') {
                return true;
            }
        }))
    }

    isDiscreteOnlyOpenClose(): boolean {
        return false;
    }

    isAcknowledgementNeeded(): boolean {
        return false;
    }
}

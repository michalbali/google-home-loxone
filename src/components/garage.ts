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
import { GateComponent } from './gate';

export class GarageComponent extends GateComponent {

    constructor(rawComponent: ComponentRaw, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>) {
        super(rawComponent, loxoneRequest, statesEvents, ComponentType.GARAGE);
    }

    //ideally: acknowledgement is needed only if opening garage. If garage is already open, no need to acknowledge
    isAcknowledgementNeeded(): boolean {
        return this.isClosed() ? true : false;
    }

}

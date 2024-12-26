import { Observable, of, Subject } from 'rxjs';
import { distinct, distinctUntilChanged, map } from 'rxjs/operators';
import { CapabilityHandler } from '../capabilities/capability-handler';
import { EndpointHealthHandler } from '../capabilities/endpoint-health';
import { OnOff, OnOffHandler } from '../capabilities/on-off';
import { ComponentRaw } from '../config';
import { ErrorType } from '../error';
import { LoxoneRequest } from '../loxone-request';
import { Component, ComponentType } from './component';

/*

## Listening using states.activeMoods

living on
2024-12-07T07:17:59.961Z INFO : Update event text: uuid=1171133c-024d-1807-ffff504f941036f8, evt=[1]

living off
2024-12-07T07:18:02.519Z INFO : Update event text: uuid=1171133c-024d-1807-ffff504f941036f8, evt=[778]


countertop off
2024-12-07T07:18:25.211Z INFO : Update event text: uuid=1171133c-025d-1858-ffff504f941036f8, evt=[778]

countertop on
2024-12-07T07:18:27.071Z INFO : Update event text: uuid=1171133c-025d-1858-ffff504f941036f8, evt=[]


## Triggering
### Living:
off: jdev/sps/io/10c081b6-026b-5863-ffff112233445566/changeTo/778
on: jdev/sps/io/10c081b6-026b-5863-ffff112233445566/changeTo/1

### Countertop:
off: jdev/sps/io/10c081b6-026b-58cc-ffff112233445566/changeTo/778
on: jdev/sps/io/10c081b6-026b-58cc-ffff112233445566/changeTo/1
*/

export class LightComponentV2 extends Component implements OnOff {
    private on: boolean;

    constructor(rawComponent: ComponentRaw, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>) {
        super(rawComponent, ComponentType.LIGHT, loxoneRequest, statesEvents);

        this.loxoneRequest.getControlInformation(this.loxoneId).subscribe(light => {
            this.loxoneRequest.watchComponentText(light.states['activeMoods'])
                .pipe(distinctUntilChanged())
                .subscribe((event) => {                    
                    this.on = event === '[778]' ? false : true;
                    this.statesEvents.next(this);                    
                });
        });
    }

    getCapabilities(): CapabilityHandler<any>[] {
        return [
            OnOffHandler.INSTANCE,
            EndpointHealthHandler.INSTANCE
        ];
    }

    turnOn(): Observable<boolean> {
        return this.loxoneRequest.sendCmd(this.loxoneId, 'changeTo/1').pipe(map((result) => {
            if (result.code === '200') {
                this.on = true;
                this.statesEvents.next(this);
                return true;
            }
            throw new Error(ErrorType.ENDPOINT_UNREACHABLE)
        }))
    }

    turnOff(): Observable<boolean> {
        return this.loxoneRequest.sendCmd(this.loxoneId, 'changeTo/778').pipe(map((result) => {
            if (result.code === '200') {
                this.on = false;
                this.statesEvents.next(this);
                return true;
            }
            throw new Error(ErrorType.ENDPOINT_UNREACHABLE)
        }))
    }

    getPowerState(): Observable<any> {
        return of(this.on);
    }

}

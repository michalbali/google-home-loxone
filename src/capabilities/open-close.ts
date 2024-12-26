import { Observable, forkJoin, of } from 'rxjs';
import { map, mergeMap, switchMap } from 'rxjs/operators';
import { ErrorType } from '../error';
import { Capability, CapabilityHandler } from './capability-handler';
import { Log } from '../log';

export class OpenCloseAttributes {
    discreteOnlyOpenClose?: boolean;
    openDirection?: Array<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'IN' | 'OUT'>;
    commandOnlyOpenClose?: boolean;
    queryOnlyOpenClose?: boolean;
}

export interface OpenClose extends Capability {
    open(): Observable<boolean>;

    close(): Observable<boolean>;

    getPosition(): Observable<number>;

    setPosition(percent: number): Observable<boolean>;

    isDiscreteOnlyOpenClose(): boolean;

    isAcknowledgementNeeded(): boolean;
}

export class OpenCloseHandler implements CapabilityHandler<OpenClose> {
    public static INSTANCE = new OpenCloseHandler();

    getCommands(): string[] {
        return ['action.devices.commands.OpenClose'/*, 'action.devices.commands.OpenCloseRelative'*/];
    }

    getTrait(): string {
        return 'action.devices.traits.OpenClose'
    }

    getAttributes(component: OpenClose): OpenCloseAttributes {
        return {
            queryOnlyOpenClose: false,
            discreteOnlyOpenClose: component.isDiscreteOnlyOpenClose()
        };
    }

    getState(component: OpenClose): Observable<any> {
        return component.getPosition().pipe(
            map(result => {
                return {
                    openPercent: result
                }
            })
        );
    }

    handleCommands(component: OpenClose, command: string, payload?: any, challenge?: any): Observable<boolean> {
        if (this.getAttributes(component)?.queryOnlyOpenClose) {
            Log.error('Component with queryOnlyOpenClose attribute can not be commanded');
            throw new Error(ErrorType.NOT_SUPPORTED_IN_CURRENT_MODE);
        }

        if (component.isAcknowledgementNeeded() && !challenge?.ack) {
            throw new Error(ErrorType.CHALLENGE_NEEDED_ACK);
        }

        switch (command) {
            case 'action.devices.commands.OpenClose':
                return this.handleOpenClose(component, payload);
            // case 'action.devices.commands.OpenCloseRelative':
            //     return this.handleOpenCloseRelative(component, payload);
            default:
                Log.error('Command is not supported', command);
                return of(false);
        }
    }

    private handleOpenClose(component: OpenClose, payload: any): Observable<boolean> {
        const percent = payload['openPercent'];
        if (percent === 0) {
            return component.close()
        } else if (percent === 100) {
            return component.open();
        } else if (percent > 0 && percent < 100) {
            return component.setPosition(percent);
        } else {
            Log.error('Error during moving blind', component, payload);
            of(false);
        }
    }

    // private handleOpenCloseRelative(component: OpenClose, payload: any): Observable<boolean> {
    //     return component.getPosition().pipe(
    //         switchMap((openPercent) => {
    //             const newOpenPercent = openPercent + payload['openRelativePercent'];
    //             if (newOpenPercent < 0) {
    //                 return component.close();
    //             } else if (newOpenPercent > 100) {
    //                 return component.open();
    //             } else {
    //                 return component.setPosition(newOpenPercent);
    //             }
    //         })
    //     );
    // }
}

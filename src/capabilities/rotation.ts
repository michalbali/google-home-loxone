import { Observable, forkJoin, of } from 'rxjs';
import { map, mergeMap, switchMap } from 'rxjs/operators';
import { ErrorType } from '../error';
import { Capability, CapabilityHandler } from './capability-handler';

export class RotationAttributes {
    supportsDegrees: boolean;
    supportsPercent: boolean;
    rotationDegreesRange: RotationDegreesRange;
}

export class RotationDegreesRange {
    rotationDegreesMin: number;
    rotationDegreesMax: number;
}

export interface Rotation extends Capability {
    getShadePosition(): Observable<number>;

    setShadePosition(percent: number): Observable<boolean>;
}

export class RotationHandler implements CapabilityHandler<Rotation> {
    public static INSTANCE = new RotationHandler();

    getCommands(): string[] {
        return ['action.devices.commands.RotateAbsolute'];
    }

    getTrait(): string {
        return 'action.devices.traits.Rotation'
    }

    getAttributes(component: Rotation): RotationAttributes {
        return {
            supportsDegrees: false,
            supportsPercent: true,
            rotationDegreesRange: {
                rotationDegreesMin: 0,
                rotationDegreesMax: 90
            }
        }
    }

    getState(component: Rotation): Observable<any> {
        return component.getShadePosition().pipe(map(result => {
            return {
                rotationPercent: result
            }
        }));
    }

    handleCommands(component: Rotation, command: string, payload?: any): Observable<boolean> {
        return component.setShadePosition(payload['rotationPercent']);
    }

}

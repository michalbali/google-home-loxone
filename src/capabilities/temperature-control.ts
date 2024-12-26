import { map, Observable, of } from 'rxjs';
import { Capability, CapabilityHandler } from './capability-handler';
import { Log } from '../log';

export interface TemperatureControl extends Capability {
  getTemperature(): Observable<any>;
}

export class TemperatureControlHandler implements CapabilityHandler<TemperatureControl> {
  public static INSTANCE = new TemperatureControlHandler();

  getCommands(): string[] {
    return [
      'action.devices.commands.SetTemperature'
    ];
  }

  getAttributes(component: TemperatureControl): any {
    return {
      'temperatureRange': {
        'minThresholdCelsius': 1,
        'maxThresholdCelsius': 100
      },
      'temperatureStepCelsius': 0.1,
      'temperatureUnitForUX': 'C',
      'queryOnlyTemperatureControl': true
    }
  }

  getState(component: TemperatureControl): Observable<any> {
    //component.getTemperature().subscribe(result => Log.info('TemperatureControlHandler.getState ', result));
    return component.getTemperature().pipe(map(result => {
      return {
        temperatureAmbientCelsius: result
      }
    }));
  }

  getTrait(): string {
    return 'action.devices.traits.TemperatureControl';
  }

  handleCommands(component: TemperatureControl, command: string, payload?: any): Observable<boolean> {
    Log.info('No TemperatureComponent control handle');
    return of(true);
  }
}

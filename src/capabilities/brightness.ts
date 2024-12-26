import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Capability, CapabilityHandler } from './capability-handler';
import { Log } from '../log';

export interface Brightness extends Capability {
  setBrightness(value: number): Observable<boolean>;

  getBrightnessState(): Observable<number>;
}

export class BrightnessHandler implements CapabilityHandler<Brightness> {
  public static INSTANCE = new BrightnessHandler();

  getCommands(): string[] {
    return ['action.devices.commands.BrightnessAbsolute'];
  }

  getTrait(): string {
    return 'action.devices.traits.Brightness'
  }

  getAttributes(component: Brightness): any {
    return {}
  }

  getState(component: Brightness): Observable<any> {
    return component.getBrightnessState().pipe(
      map(val => {
        return {
          brightness: val
        }
      })
    );
  }

  handleCommands(component: Brightness, command: string, payload?: any): Observable<boolean> {
    if (payload['brightness']) {
      return component.setBrightness(+payload['brightness']);
    } else {
      Log.error('Error during setting brightness', component, payload);
      of(false);
    }
  }
}

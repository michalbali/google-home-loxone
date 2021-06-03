import {Observable, of, Subject} from 'rxjs/index';
import {CapabilityHandler} from '../capabilities/capability-handler';
import {TemperatureSetting, TemperatureSettingHandler, TemperatureState} from '../capabilities/temperature-setting';
import {ComponentRaw} from '../config';
import {LoxoneRequest} from '../loxone-request';
import {Component} from './component';

export class TemperatureComponent extends Component implements TemperatureSetting {
  protected temperatureState: TemperatureState = new TemperatureState();

  constructor(rawComponent: ComponentRaw, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>) {
    super(rawComponent, loxoneRequest, statesEvents);

    this.loxoneRequest.getControlInformation(this.loxoneId).subscribe(temperature => {
        // Subscribe on active status update of the current switch
        this.loxoneRequest.watchComponent(temperature.states.tempActual).subscribe((event) => {
            this.temperatureState.thermostatTemperatureAmbient = parseInt(event, 10);
            this.statesEvents.next(this);
        });
        this.loxoneRequest.watchComponent(temperature.states.tempTarget).subscribe((event) => {
            this.temperatureState.thermostatTemperatureSetpoint = parseInt(event, 10);
            this.statesEvents.next(this);
        });
        this.loxoneRequest.watchComponent(temperature.states.operatingMode).subscribe((event) => {
            switch(parseInt(event)) {
              case 0: this.temperatureState.thermostatMode = 'heatcool'; break;
              case 1: this.temperatureState.thermostatMode = 'heat'; break;
              case 2: this.temperatureState.thermostatMode = 'cool'; break;
            }
            this.statesEvents.next(this);
        });
    });
  }

  getCapabilities(): CapabilityHandler<any>[] {
    return [
      TemperatureSettingHandler.INSTANCE
    ];
  }

  getTemperature(): Observable<TemperatureState> {
    return of(this.temperatureState)
  }
}

import { distinctUntilChanged, map, Observable, of, Subject } from 'rxjs';
import { CapabilityHandler } from '../capabilities/capability-handler';
import { ComponentRaw } from '../config';
import { LoxoneRequest } from '../loxone-request';
import { Component, ComponentType } from './component';
import { Log } from '../log';
import { TemperatureControl, TemperatureControlHandler } from '../capabilities/temperature-control';

export class BoilerComponent extends Component implements TemperatureControl {
  private temperatureCelsius: number;

  constructor(rawComponent: ComponentRaw, loxoneRequest: LoxoneRequest, statesEvents: Subject<Component>) {
    super(rawComponent, ComponentType.BOILER, loxoneRequest, statesEvents);

    this.loxoneRequest.getControlInformation(this.loxoneId).subscribe(boiler => {
      this.loxoneRequest.watchComponent(boiler.states.value).pipe(
        map(event => parseFloat(event)),
        distinctUntilChanged((prev, curr) => Math.abs(curr - prev) < 0.5)
      ).subscribe((newTemperature) => {
        this.temperatureCelsius = newTemperature;
        //Log.info(`BoilerComponent ${this.name} (${this.loxoneId}) temperature changed to ${this.temperatureCelsius}`);
        this.statesEvents.next(this);
      });
    });
  }

  getCapabilities(): CapabilityHandler<any>[] {
    return [
      TemperatureControlHandler.INSTANCE
    ];
  }

  getTemperature(): Observable<number> {
    return of(this.temperatureCelsius);
  }
}

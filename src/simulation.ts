import { IConsumptionHandler, IPriceHandler, IStorage } from "./interfaces";
import { SimulationProps, SimulationResult, SimulationType } from "./types";

export class Simulation {
  private priceHandler: IPriceHandler;
  private consumptionHandler: IConsumptionHandler;
  private storage: IStorage;

  constructor(
    priceHandler: IPriceHandler,
    consumptionHandler: IConsumptionHandler,
    storage: IStorage
  ) {
    this.priceHandler = priceHandler;
    this.consumptionHandler = consumptionHandler;
    this.storage = storage;
  }

  start(simulationProps: SimulationProps): SimulationResult {
    const averagePrice = this.priceHandler.getAveragePrice();
    const hysteresis = (averagePrice * simulationProps.hysteresisChargeDischargePercent) / 100;
    const limitForCharge = averagePrice - hysteresis;
    const limitForDischarge = averagePrice + hysteresis;

    const supportedRange = this.priceHandler.getRange();

    const hour = 1000 * 60 * 60; // in milliseconds

    if (simulationProps.simulationType === SimulationType.GRID_INVERTER) {
      this.storage.setConsumptionLimit(800);
    } else {
      this.storage.resetConsumptionLimit();
    }

    let dynamicPriceSum = 0;
    let fixedPriceSum = 0;

    for (
      let current = supportedRange.from.getTime();
      current <= supportedRange.to.getTime();
      current += hour
    ) {
      const currentTime = new Date(current);

      const currentPrice = this.priceHandler.getPrice(currentTime);
      const currentConsumptionWh = this.consumptionHandler.getConsumption(currentTime);
      const currentConsumptionKwh = currentConsumptionWh / 1000;

      const currentConsumptionWh800 = this.consumptionHandler.get800WConsumption(currentTime);

      let paidPrice: number;
      const priceWithoutBatteryIncluded = currentConsumptionKwh * currentPrice;

      if (currentPrice < limitForCharge) {
        if (simulationProps.simulationType === SimulationType.STAND_ALONE_INVERTER) {
          paidPrice = this.belowLowerLimitPriceStandAlone(
            simulationProps,
            currentConsumptionWh,
            currentConsumptionKwh,
            currentPrice
          );
        } else if (
          simulationProps.simulationType === SimulationType.GRID_INVERTER ||
          simulationProps.simulationType === SimulationType.STAND_ALONE_PLUS
        ) {
          paidPrice = this.belowLowerLimitPriceGridOrStandAlonePlus(
            simulationProps,
            currentConsumptionKwh,
            currentPrice
          );
        } else {
          throw "unsupported operation";
        }
      } else if (currentPrice > limitForDischarge) {
        if (
          simulationProps.simulationType === SimulationType.STAND_ALONE_INVERTER ||
          simulationProps.simulationType === SimulationType.STAND_ALONE_PLUS
        ) {
          paidPrice = this.standAloneDischarge(currentConsumptionWh, currentPrice);
        } else {
          const storageResult = this.storage.process(
            0,
            currentConsumptionWh800 ?? currentConsumptionWh
          );
          const usedFromBatteryKwh =
            (storageResult.dischargedWh - storageResult.efficiencyLossWh) / 1000;
          paidPrice = (currentConsumptionKwh - usedFromBatteryKwh) * currentPrice;
        }

        if (paidPrice > priceWithoutBatteryIncluded) {
          throw `paid price must be equal or less the value without battery (${paidPrice} vs ${priceWithoutBatteryIncluded})`;
        }
      } else {
        if (simulationProps.simulationType === SimulationType.GRID_INVERTER) {
          // no charging and discharging
          paidPrice = priceWithoutBatteryIncluded;
        } else {
          // battery discharged
          paidPrice = this.standAloneDischarge(currentConsumptionWh, currentPrice);
        }
      }

      dynamicPriceSum = dynamicPriceSum + paidPrice;
      fixedPriceSum =
        fixedPriceSum +
        (simulationProps.fixedPrice
          ? currentConsumptionKwh * simulationProps.fixedPrice
          : priceWithoutBatteryIncluded);
    }

    return {
      totalCostsDynamic: dynamicPriceSum,
      totalCostsFixed: fixedPriceSum,
      minimumCharge: this.storage.getMinimumCharge(),
      maximumCharge: this.storage.getMaximumCharge()
    };
  }

  private belowLowerLimitPriceStandAlone(
    simulationProps: SimulationProps,
    currentConsumptionWh: number,
    currentConsumptionKwh: number,
    currentPrice: number
  ) {
    const storageResult = this.storage.process(
      simulationProps.chargePowerWatt,
      currentConsumptionWh
    );

    if (storageResult.chargedWh > 0) {
      // charge power was higher than consumption
      // we assume that charging stops when battery is full
      const energyUsedForChargingKwh =
        (storageResult.chargedWh + storageResult.efficiencyLossWh) / 1000;
      return currentPrice * (energyUsedForChargingKwh + currentConsumptionKwh);
    } else if (storageResult.dischargedWh > 0) {
      // charge power lower than consumption
      const energyUsedFromBatterykWh =
        (storageResult.dischargedWh - storageResult.efficiencyLossWh) / 1000;
      return currentPrice * (currentConsumptionKwh - energyUsedFromBatterykWh);
    } else {
      return currentPrice * currentConsumptionKwh;
    }
  }

  private belowLowerLimitPriceGridOrStandAlonePlus(
    simulationProps: SimulationProps,
    currentConsumptionKwh: number,
    currentPrice: number
  ) {
    const storageResult = this.storage.process(simulationProps.chargePowerWatt, 0);

    if (storageResult.dischargedWh > 0) {
      throw "this is impossible";
    }

    const usedForStorageKwh = (storageResult.chargedWh + storageResult.efficiencyLossWh) / 1000;
    return (currentConsumptionKwh + usedForStorageKwh) * currentPrice;
  }

  private standAloneDischarge(currentConsumptionWh: number, currentPrice: number) {
    const storageResult = this.storage.process(0, currentConsumptionWh);
    const deficitKwh = storageResult.deficitWh / 1000;
    return deficitKwh * currentPrice;
  }
}

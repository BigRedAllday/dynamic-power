import { IBatteryPlanner, IConsumptionHandler, IPriceHandler, IStorage } from "./interfaces";
import { HOUR_IN_MS, SimulationProps, SimulationResult, SimulationType } from "./types";

/**
 * Simulation logic
 */
export class Simulation {
  private priceHandler: IPriceHandler;
  private consumptionHandler: IConsumptionHandler;
  private storage: IStorage;
  private batteryPlanner: IBatteryPlanner;

  constructor(
    priceHandler: IPriceHandler,
    consumptionHandler: IConsumptionHandler,
    batteryPlanner: IBatteryPlanner,
    storage: IStorage
  ) {
    this.priceHandler = priceHandler;
    this.consumptionHandler = consumptionHandler;
    this.storage = storage;
    this.batteryPlanner = batteryPlanner;
  }

  /**
   * Starts simulation
   * @param simulationProps properties for simulation
   */
  start(simulationProps: SimulationProps): SimulationResult {
    const averagePrice = this.priceHandler.getAveragePrice();
    const hysteresis = (averagePrice * simulationProps.hysteresisChargeDischargePercent) / 100;
    const limitForCharge = averagePrice - hysteresis;
    const limitForDischarge = averagePrice + hysteresis;

    const supportedRange = this.priceHandler.getRange();

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
      current += HOUR_IN_MS
    ) {
      const currentTime = new Date(current);

      const currentPrice = this.priceHandler.getPrice(currentTime);
      const consumptionData = this.consumptionHandler.getConsumption(currentTime);
      const currentConsumptionKwh = consumptionData.consumptionWh / 1000;

      let paidPrice: number;
      const priceWithoutBatteryIncluded = currentConsumptionKwh * currentPrice;

      if (
        currentPrice < limitForCharge ||
        this.batteryPlanner.getMinChargeWh(currentTime) < this.storage.getStateOfCharge()
      ) {
        // *********** CHARGE ****************
        if (!consumptionData.isBlocked) {
          if (simulationProps.simulationType === SimulationType.STAND_ALONE_INVERTER) {
            paidPrice = this.belowLowerLimitPriceStandAlone(
              simulationProps,
              consumptionData.consumptionWh,
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
        } else {
          if (simulationProps.simulationType !== SimulationType.STAND_ALONE_INVERTER) {
            // no charging and discharging
            paidPrice = priceWithoutBatteryIncluded;
          } else {
            paidPrice = 0; // completely disconnected
          }
        }
      } else if (currentPrice > limitForDischarge) {
        // *********** DISCHARGE ****************

        if (
          simulationProps.simulationType === SimulationType.STAND_ALONE_INVERTER ||
          simulationProps.simulationType === SimulationType.STAND_ALONE_PLUS
        ) {
          paidPrice = this.standAloneDischarge(consumptionData.consumptionWh, currentPrice);
        } else {
          const storageResult = this.storage.process(
            0,
            consumptionData.consumptionWh800 ?? consumptionData.consumptionWh
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
          paidPrice = this.standAloneDischarge(consumptionData.consumptionWh, currentPrice);
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

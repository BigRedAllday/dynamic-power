import { IBatteryPlanner, IConsumptionHandler, IPriceHandler, IStorage } from "./interfaces";
import {
  HOUR_IN_MS,
  TSimulationProps,
  TSimulationResult,
  ESimulationType,
  TConsumptionDataHourly
} from "./types";
import * as fs from "fs";
import { addHours } from "date-fns";

/**
 * Simulation logic
 */
export class BatterySimulation {
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
   * @param plot plot results in csv file
   */
  start(simulationProps: TSimulationProps, plot?: boolean): TSimulationResult {
    const averagePrice = this.priceHandler.getAveragePrice();
    const hysteresis = (averagePrice * simulationProps.hysteresisChargeDischargePercent) / 100;
    const limitForCharge = averagePrice - hysteresis;
    const limitForDischarge = averagePrice + hysteresis;

    const supportedRange = this.priceHandler.getRange();

    if (simulationProps.simulationType === ESimulationType.GRID_INVERTER) {
      this.storage.setConsumptionLimit(800);
    } else {
      this.storage.resetConsumptionLimit();
    }

    let dynamicPriceSum = 0;
    let fixedPriceSum = 0;

    let csvLines: string = "";

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

      // get min charge for next hour to be "prepared"
      const minChargeNextHour = this.batteryPlanner.getMinChargeWh(addHours(currentTime, 1));

      if (currentPrice < limitForCharge || minChargeNextHour > this.storage.getStateOfCharge()) {
        // *********** CHARGE ****************
        if (!consumptionData.isBlocked) {
          if (simulationProps.simulationType === ESimulationType.STAND_ALONE_INVERTER) {
            paidPrice = this.belowLowerLimitPriceStandAlone(
              simulationProps,
              consumptionData.consumptionWh,
              currentConsumptionKwh,
              currentPrice
            );
          } else if (
            simulationProps.simulationType === ESimulationType.GRID_INVERTER ||
            simulationProps.simulationType === ESimulationType.STAND_ALONE_PLUS
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
          if (simulationProps.simulationType !== ESimulationType.STAND_ALONE_INVERTER) {
            // no charging and discharging
            paidPrice = priceWithoutBatteryIncluded;
          } else {
            paidPrice = 0; // completely disconnected
            this.storage.process(0, consumptionData.consumptionWh);
          }
        }
      } else if (currentPrice > limitForDischarge) {
        // *********** DISCHARGE ****************

        if (
          simulationProps.simulationType === ESimulationType.STAND_ALONE_INVERTER ||
          simulationProps.simulationType === ESimulationType.STAND_ALONE_PLUS
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
        if (simulationProps.simulationType === ESimulationType.GRID_INVERTER) {
          // no charging and discharging
          paidPrice = priceWithoutBatteryIncluded;
        } else {
          // battery discharged
          paidPrice = this.standAloneDischarge(consumptionData.consumptionWh, currentPrice);
          if (paidPrice > 0 && consumptionData.isBlocked) {
            throw Error(
              "Something went wrong. Prices in blocked areas must have been paid before."
            );
          }
        }
      }

      const currentFixedPrice = simulationProps.fixedPrice
        ? currentConsumptionKwh * simulationProps.fixedPrice
        : priceWithoutBatteryIncluded;

      if (plot) {
        csvLines =
          csvLines +
          this.getCsvLine(
            currentTime,
            consumptionData,
            currentPrice,
            paidPrice,
            currentFixedPrice,
            limitForCharge,
            limitForDischarge,
            this.storage.getStateOfCharge(),
            minChargeNextHour
          );
      }

      dynamicPriceSum = dynamicPriceSum + paidPrice;
      fixedPriceSum = fixedPriceSum + currentFixedPrice;
    }

    if (plot) {
      fs.writeFileSync("plot.csv", this.getCsvHeader() + csvLines, { flag: "w" });
      console.log(`All values of best result logged into plot.csv`);
    }

    return {
      totalCostsDynamic: dynamicPriceSum,
      totalCostsFixed: fixedPriceSum,
      minimumCharge: this.storage.getMinimumCharge(),
      maximumCharge: this.storage.getMaximumCharge()
    };
  }

  private belowLowerLimitPriceStandAlone(
    simulationProps: TSimulationProps,
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
    simulationProps: TSimulationProps,
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

  private getCsvLine(
    currentTime: Date,
    consumptionData: TConsumptionDataHourly,
    currentPrice: number,
    paidPrice: number,
    fixedPrice: number,
    limitForCharge: number,
    limitForDischarge: number,
    stageOfCharge: number,
    minCharge: number
  ): string {
    let csvLine = `${currentTime.toISOString()};`;
    csvLine = csvLine + `${consumptionData.consumptionWh};`;
    csvLine = csvLine + `${currentPrice.toFixed(3)};`;
    csvLine = csvLine + `${paidPrice.toFixed(3)};`;
    csvLine = csvLine + `${fixedPrice.toFixed(3)};`;
    csvLine = csvLine + `${consumptionData.isBlocked ? "blocked" : "unblocked"};`;
    csvLine = csvLine + `${limitForCharge.toFixed(3)};`;
    csvLine = csvLine + `${limitForDischarge.toFixed(3)};`;
    csvLine = csvLine + `${stageOfCharge.toFixed(3)};`;
    csvLine = csvLine + `${minCharge.toFixed(3)};`;
    csvLine = csvLine + "\n";
    return csvLine;
  }

  getCsvHeader(): string {
    let header = "Time;ConsumptionWh;Current Price;Paid Price;Fixed Price;";
    header = header + "Blocked;Charge Limit;Discharge Limit;State of Charge;Required Charge\n";
    return header;
  }
}

import {TBestPriceValue, TConsumptionDataHourly, TStorageProcessResult} from "./types";

export interface IPriceHandler {
  getAveragePrice(): number;
  getRange(): { from: Date; to: Date };
  getPrice(date: Date): number;
  getBestPeriodOfDay(date: Date, numberOfHours: number): TBestPriceValue[];
}

export interface IConsumptionHandler {
  getConsumption(date: Date): TConsumptionDataHourly;
  getCompressedConsumptionsOfDay(date: Date): number[];
}

export interface IBatteryPlanner {
  getMinChargeWh(date: Date): number;
}

export interface IStorage {
  process(feedInWh: number, consumptionWh: number): TStorageProcessResult;
  setConsumptionLimit(limit: number): void;
  resetConsumptionLimit(): void;
  getMinimumCharge(): number | undefined;
  getMaximumCharge(): number;
  isEmpty(): boolean;
  getStateOfCharge(): number;
}

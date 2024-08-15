import { ConsumptionData, TStorageProcessResult } from "./types";

export interface IPriceHandler {
  getAveragePrice(): number;
  getRange(): { from: Date; to: Date };
  getPrice(date: Date): number;
}

export interface IConsumptionHandler {
  getConsumption(date: Date): ConsumptionData;
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

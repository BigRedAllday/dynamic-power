import { TStorageProcessResult } from "./types";

export interface IPriceHandler {
  getAveragePrice(): number;
  getRange(): { from: Date; to: Date };
  getPrice(date: Date): number;
}

export interface IConsumptionHandler {
  getConsumption(date: Date): number;
  get800WConsumption(date: Date): number | undefined;
}

export interface IStorage {
  process(feedInWh: number, consumptionWh: number): TStorageProcessResult;
  setConsumptionLimit(limit: number): void;
  resetConsumptionLimit(): void;
  getMinimumCharge(): number | undefined;
  getMaximumCharge(): number;
  isEmpty(): boolean;
}

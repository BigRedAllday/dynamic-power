import fs from "fs";
import {addHours, endOfDay, isBefore, parse, startOfDay, startOfHour} from "date-fns";
import { de } from "date-fns/locale";
import { IPriceHandler } from "./interfaces";
import {TBestPriceValue, TRange} from "./types";

/**
 * Handles energy prices
 */
export class PriceHandler implements IPriceHandler {
  private readonly taxes: number;
  private prices: Map<string, number> = new Map();

  constructor(taxesEuro: number) {
    this.taxes = taxesEuro;
    console.log("Taxes and duties: " + this.taxes);
  }

  /**
   * Loads energy prices into memory
   */
  loadPriceTable() {
    const fileContent = fs.readFileSync("./data/day_ahead_prices.csv", "utf8");
    const lines = fileContent.split("\n");

    for (const line of lines) {
      if (lines.indexOf(line) === 0 || line.length === 0) {
        continue;
      }

      const values = line.split(";");
      const date = values[0];
      const price = values[4];

      const parsedDateTime = parse(date, "dd.MM.yyyy HH:mm", new Date(), { locale: de });
      const paredPrice = Number.parseFloat(price);
      this.prices.set(parsedDateTime.toISOString(), paredPrice);
    }
  }

  /**
   * Returns time range of energy prices
   */
  getRange(): TRange {
    const keys = Array.from(this.prices.keys());
    keys.sort();

    return {
      from: new Date(keys[0]),
      to: new Date(keys[keys.length - 1])
    };
  }

  /**
   * Returns average energy price
   */
  getAveragePrice() {
    const values = Array.from(this.prices.values());
    const sum = values.reduce((acc, current) => acc + current, 0);
    return this.taxes + sum / values.length;
  }

  /**
   * Returns price for a special date
   * @param date
   */
  getPrice(date: Date) {
    if (this.prices.size === 0) {
      throw "Price table not loaded";
    }
    const startOfInterval = startOfHour(date);
    const price = this.prices.get(startOfInterval.toISOString());
    if (price === undefined) {
      throw `Price for ${date} not available`;
    }
    return price + this.taxes;
  }

  /**
   * Returns the best period of the day of the given date
   * @param date date
   * @param numberOfHours longitud of the period
   * @private
   */
  getBestPeriodOfDay(date: Date, numberOfHours: number): TBestPriceValue[] {
    let currentDate = startOfDay(date);
    const endOfCurrentDay = endOfDay(date);
    const allPrices: TBestPriceValue[] = [];

    while (isBefore(currentDate, endOfCurrentDay)) {
      allPrices.push({date: currentDate, price: this.getPrice(currentDate)});
      currentDate = addHours(currentDate, 1);
    }

    return this.findMinSumSubarray(allPrices, numberOfHours);
  }

  private findMinSumSubarray(prices: TBestPriceValue[], numberOfHours: number): TBestPriceValue[] {
    if (numberOfHours > prices.length) {
      throw new Error("x is larger than the array length");
    }

    let minSum = Infinity;
    let minSubarray: TBestPriceValue[] = [];

    for (let i = 0; i <= prices.length - numberOfHours; i++) {
      let currentSum = 0;
      for (let j = 0; j < numberOfHours; j++) {
        currentSum += prices[i + j].price;
      }
      if (currentSum < minSum) {
        minSum = currentSum;
        minSubarray = prices.slice(i, i + numberOfHours);
      }
    }

    return minSubarray;
  }
}

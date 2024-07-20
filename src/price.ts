import fs from "fs";
import { parse, startOfHour } from "date-fns";
import { de } from "date-fns/locale";
import { IPriceHandler } from "./interfaces";

export class PriceHandler implements IPriceHandler {
  private readonly consumptionPrice: number;
  private prices: Map<string, number> = new Map();

  constructor(consumptionPriceEuro: number) {
    this.consumptionPrice = consumptionPriceEuro;
    console.log("Consumption price: " + this.consumptionPrice);
  }

  loadPriceTable() {
    const fileContent = fs.readFileSync("./data/prices.csv", "utf8");
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

  getRange(): { from: Date; to: Date } {
    const keys = Array.from(this.prices.keys());
    keys.sort();

    return {
      from: new Date(keys[0]),
      to: new Date(keys[keys.length - 1])
    };
  }

  getAveragePrice() {
    const values = Array.from(this.prices.values());
    const sum = values.reduce((acc, current) => acc + current, 0);
    return this.consumptionPrice + sum / values.length;
  }

  getPrice(date: Date) {
    if (this.prices.size === 0) {
      throw "Price table not loaded";
    }
    const startOfInterval = startOfHour(date);
    const price = this.prices.get(startOfInterval.toISOString());
    if (price === undefined) {
      throw `Price for ${date} not available`;
    }
    return price + this.consumptionPrice;
  }
}

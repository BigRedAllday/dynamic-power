import fs from "fs";
import { IConsumptionHandler } from "./interfaces";
import { ConsumptionProfiles } from "./types";

export class ConsumptionHandler implements IConsumptionHandler {
  private consumptionMap: Map<string, { value: number; value800?: number }> = new Map();

  loadProfiles(profiles: ConsumptionProfiles[]) {
    for (const profile of profiles) {
      const fileContent = fs.readFileSync(`./data/consumption-profiles/${profile}`, "utf8");
      if (!fileContent) {
        throw `Profile ${profile} not found`;
      }
      const lines = fileContent.split("\n");

      for (const line of lines) {
        if (lines.indexOf(line) === 0 || line.length === 0) {
          continue;
        }

        const values = line.split(";");
        const key = `${values[0]}${values[1]}`;
        const value = Number.parseFloat(values[2]);
        const value800W = values[3] !== undefined ? Number.parseFloat(values[3]) : undefined;

        const currentValue = this.consumptionMap.get(key);

        if (currentValue !== undefined) {
          currentValue.value = currentValue.value + value;
          if (value800W) {
            currentValue.value800 = currentValue.value800! + value800W;
          }
          this.consumptionMap.set(key, currentValue);
        } else {
          this.consumptionMap.set(key, {
            value,
            value800: value800W
          });
        }
      }
    }
  }

  getConsumption(date: Date): number {
    const key = this.getDayOfWeek(date) + date.getHours();
    const consumption = this.consumptionMap.get(key);
    if (consumption === undefined) {
      throw `Consumption for ${date} not found`;
    }
    return consumption.value;
  }

  get800WConsumption(date: Date): number | undefined {
    const key = this.getDayOfWeek(date) + date.getHours();
    const consumption = this.consumptionMap.get(key);
    if (consumption === undefined) {
      throw `Consumption for ${date} not found`;
    }
    return consumption.value800;
  }

  private getDayOfWeek(date: Date): string {
    const daysOfWeek: string[] = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];

    const dayIndex: number = date.getDay();
    return daysOfWeek[dayIndex];
  }
}

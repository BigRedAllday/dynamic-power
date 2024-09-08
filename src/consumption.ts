import fs from "fs";
import { IConsumptionHandler } from "./interfaces";
import {TConsumptionDataHourly, EConsumptionProfiles} from "./types";
import Holidays from "date-holidays";

export class ConsumptionHandler implements IConsumptionHandler {
  private consumptionMapHourly: Map<string, TConsumptionDataHourly> = new Map();
  private consumptionMapDaily: Map<string, number[]> = new Map();
  private holidays: Holidays;
  private holidayCache: Map<string, boolean>;

  constructor() {
    this.holidays = new Holidays("DE");
    this.holidayCache = new Map();
  }

  /**
   * Load profiles and make the available
   * @param profiles one or more profiles
   */
  loadProfiles(profiles: EConsumptionProfiles[]) {
    this.consumptionMapHourly.clear();

    for (const profile of profiles) {
      const fileContent = fs.readFileSync(`./data/consumption-profiles/${profile}`, "utf8");
      if (!fileContent) {
        throw `Profile ${profile} not found`;
      }
      const lines = fileContent.split("\n");

      let currentDailyIndex = 0;

      for (const line of lines) {
        if (lines.indexOf(line) === 0 || line.length === 0) {
          continue;
        }

        const values = line.split(";");
        this.setHourlyValues(values);

        // daily values
        const key = values[0];
        const value = Number.parseFloat(values[2]);

        if (value !== 0) {
          const currentValues = this.consumptionMapDaily.get(key);

          if (!currentValues) {
            this.consumptionMapDaily.set(key, [value]);
          } else if (currentValues.length <= currentDailyIndex) {
            currentValues.push(value);
          } else {
            currentValues[currentDailyIndex] = currentValues[currentDailyIndex] + value;
          }

          currentDailyIndex = currentDailyIndex + 1;
        }
      }
    }
  }

  /**
   * Get consumption for a special date (using local time)
   * @param date
   */
  getConsumption(date: Date): TConsumptionDataHourly {
    const key = this.getDayOfWeek(date) + date.getHours();
    const consumption = this.consumptionMapHourly.get(key);
    if (consumption === undefined) {
      throw `Consumption for ${date} not found`;
    }
    return consumption;
  }

  /**
   * Returns all consumptions trying to consume then in the shortest time possible
   * @param date date to request
   */
  getCompressedConsumptionsOfDay(date: Date): number[] {
    const key = this.getDayOfWeek(date);
    const consumptionDataDaily = this.consumptionMapDaily.get(key);
    if (!consumptionDataDaily) {
      throw Error("No consumption found");
    }
    return consumptionDataDaily;
  }

  /**
   * Returns true, if the consumption has any blocked time ranges
   */
  hasBlockedAreas() {
    return Array.from(this.consumptionMapHourly.values()).some(c => c.isBlocked);
  }

  private setHourlyValues(lineValues: string[]) {
    const key = `${lineValues[0]}${lineValues[1]}`;
    const value = Number.parseFloat(lineValues[2]);
    const value800WOrBlocked = lineValues[3] !== undefined ? lineValues[3]?.trim() : undefined;

    const currentValue = this.consumptionMapHourly.get(key);

    if (currentValue !== undefined) {
      currentValue.consumptionWh = currentValue.consumptionWh + value;
      this.setBlockedOr800WhValue(value800WOrBlocked, currentValue);
      this.consumptionMapHourly.set(key, currentValue);
    } else {
      const consumptionData: TConsumptionDataHourly = {
        consumptionWh: value
      };
      this.setBlockedOr800WhValue(value800WOrBlocked, consumptionData);
      this.consumptionMapHourly.set(key, consumptionData);
    }
  }

  private setBlockedOr800WhValue(
    value800WOrBlocked: string | undefined,
    currentValue: TConsumptionDataHourly
  ) {
    if (value800WOrBlocked === "blocked") {
      // if some of the profiles are blocked, this counts for every profile
      currentValue.isBlocked = true;
    } else if (value800WOrBlocked) {
      currentValue.consumptionWh800 =
        (currentValue.consumptionWh800 ?? 0) + Number.parseFloat(value800WOrBlocked);
    }
  }

  private getDayOfWeek(date: Date): string {
    const daysOfWeek: string[] = [
      "Sunday/Holiday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];

    let isHoliday = this.holidayCache.get(date.toISOString());
    if (isHoliday === undefined) {
      isHoliday = this.holidays.isHoliday(date) !== false;
      this.holidayCache.set(date.toISOString(), isHoliday);
    }

    const dayIndex: number = isHoliday ? 0 : date.getDay();
    return daysOfWeek[dayIndex];
  }
}

import fs from "fs";
import { IConsumptionHandler } from "./interfaces";
import { TConsumptionData, EConsumptionProfiles } from "./types";
import Holidays from "date-holidays";

export class ConsumptionHandler implements IConsumptionHandler {
  private consumptionMap: Map<string, TConsumptionData> = new Map();
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
    this.consumptionMap.clear();

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
        const value800WOrBlocked = values[3] !== undefined ? values[3]?.trim() : undefined;

        const currentValue = this.consumptionMap.get(key);

        if (currentValue !== undefined) {
          currentValue.consumptionWh = currentValue.consumptionWh + value;
          this.setBlockedOr800WhValue(value800WOrBlocked, currentValue);
          this.consumptionMap.set(key, currentValue);
        } else {
          const consumptionData: TConsumptionData = {
            consumptionWh: value
          };
          this.setBlockedOr800WhValue(value800WOrBlocked, consumptionData);
          this.consumptionMap.set(key, consumptionData);
        }
      }
    }
  }

  /**
   * Get consumption for a special date (using local time)
   * @param date
   */
  getConsumption(date: Date): TConsumptionData {
    const key = this.getDayOfWeek(date) + date.getHours();
    const consumption = this.consumptionMap.get(key);
    if (consumption === undefined) {
      throw `Consumption for ${date} not found`;
    }
    return consumption;
  }

  /**
   * Returns true, if the consumption has any blocked time ranges
   */
  hasBlockedAreas() {
    return Array.from(this.consumptionMap.values()).some(c => c.isBlocked);
  }

  private setBlockedOr800WhValue(
    value800WOrBlocked: string | undefined,
    currentValue: TConsumptionData
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

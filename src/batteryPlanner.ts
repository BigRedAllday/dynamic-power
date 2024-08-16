import { IBatteryPlanner, IConsumptionHandler } from "./interfaces";
import { HOUR_IN_MS, TRange } from "./types";

/**
 * Calculates the minimum charge for the battery must have to survive (never discharge) a blocked timerange (with additional buffer)
 */
export class BatteryPlanner implements IBatteryPlanner {
  public static BUFFER_PERCENT = 20;
  private minChargeMap: Map<string, number> = new Map();
  private infoReturned: boolean = false;
  private hasBlockedAreas: boolean = false;

  constructor(private consumptionHandler: IConsumptionHandler) {}

  /**
   * (Re) Calculates min charge states of battery with consumptions of the consumption handler
   * @param chargePowerWatt Power the battery can be charged with
   * @param range Time range
   */
  calculateMinCharges(chargePowerWatt: number, range: TRange) {
    this.minChargeMap.clear();

    let energyCurrentBlock = 0;
    const multiplierBuffer = BatteryPlanner.BUFFER_PERCENT / 100 + 1;

    // go backwards through range
    for (let current = range.to.getTime(); current >= range.from.getTime(); current -= HOUR_IN_MS) {
      const currentTime = new Date(current);
      const currentConsumption = this.consumptionHandler.getConsumption(currentTime);
      if (currentConsumption.isBlocked) {
        energyCurrentBlock =
          energyCurrentBlock + currentConsumption.consumptionWh * multiplierBuffer;
        this.hasBlockedAreas = true;
      } else {
        energyCurrentBlock = energyCurrentBlock - chargePowerWatt;
        if (energyCurrentBlock < 0) {
          energyCurrentBlock = 0;
        }
      }
      this.minChargeMap.set(currentTime.toISOString(), energyCurrentBlock);
    }
  }

  /**
   * Get minimum charge state of a given date to guarantee energy for the next blocked time range
   * @param date
   */
  getMinChargeWh(date: Date): number {
    if (!this.hasBlockedAreas) {
      if (!this.infoReturned) {
        console.log("Battery planner (min charge for blocked areas) is deactivated");
        this.infoReturned = true;
      }
      return 0;
    } else {
      const key = date.toISOString();
      const minCharge = this.minChargeMap.get(key);
      if (minCharge === undefined) {
        throw Error(`Min Charge not found for ${date.toISOString()}`);
      }
      return minCharge;
    }
  }
}

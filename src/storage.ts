import { TStorageProcessResult } from "./types";
import { IStorage } from "./interfaces";

/**
 * Storage logic
 */
export class Storage implements IStorage {
  private currentChargeOld: number = 0;
  private currentCharge: number = 0;
  private minimumCharge: number | undefined;
  private maximumCharge: number = 0;
  private readonly sizeWh: number;
  private consumptionLimit?: number;
  private calcMinimumCharge: boolean = false;
  private readonly efficiencyPercent: number;

  constructor(sizeWh: number, efficiencyPercent: number) {
    this.sizeWh = sizeWh;
    this.efficiencyPercent = efficiencyPercent;
  }

  /**
   * Resets all data (for example sets current charge to 0)
   */
  reset() {
    this.currentCharge = 0;
    this.maximumCharge = 0;
    this.currentChargeOld = 0;
    this.minimumCharge = undefined;
    this.calcMinimumCharge = false;
  }

  /**
   * Processes feed in and consumptions
   * @param feedInWh
   * @param consumptionWh
   */
  process(feedInWh: number, consumptionWh: number): TStorageProcessResult {
    const consumptionWithLimit = this.consumptionLimit
      ? Math.min(consumptionWh, this.consumptionLimit)
      : consumptionWh;

    return this.addOrRemoveFromStorage(feedInWh, consumptionWithLimit);
  }

  /**
   * Sets maximum power the battery can provide
   * @param consumptionLimit
   */
  setConsumptionLimit(consumptionLimit: number) {
    this.consumptionLimit = consumptionLimit;
  }

  /**
   * Sets consumption limit to "no limit"
   */
  resetConsumptionLimit() {
    this.consumptionLimit = undefined;
  }

  private addOrRemoveFromStorage(feedInWh: number, consumptionWh: number): TStorageProcessResult {
    this.currentChargeOld = this.currentCharge;
    if (feedInWh > consumptionWh) {
      const addedToStorage = this.addToStorage(feedInWh - consumptionWh);
      return {
        newBatteryChargeWh: this.currentCharge,
        oldBatteryChargeWh: this.currentChargeOld,
        chargedWh: addedToStorage.charged,
        dischargedWh: 0,
        efficiencyLossWh: addedToStorage.efficiencyLoss,
        dumpedWh: addedToStorage.dumped,
        deficitWh: 0
      }; //feedInWh - addedToStorage;
    } else if (consumptionWh > feedInWh) {
      const removedFromStorage = this.removeFromStorage(consumptionWh - feedInWh);
      return {
        newBatteryChargeWh: this.currentCharge,
        oldBatteryChargeWh: this.currentChargeOld,
        dischargedWh: removedFromStorage.discharged,
        chargedWh: 0,
        efficiencyLossWh: removedFromStorage.efficiencyLoss,
        dumpedWh: 0,
        deficitWh: removedFromStorage.deficit
      };
    } else {
      return {
        newBatteryChargeWh: this.currentCharge,
        oldBatteryChargeWh: this.currentCharge,
        dischargedWh: 0,
        chargedWh: 0,
        efficiencyLossWh: 0,
        dumpedWh: 0,
        deficitWh: 0
      };
    }
  }

  private addToStorage(amountWh: number): {
    charged: number;
    efficiencyLoss: number;
    dumped: number;
  } {
    const efficiencyLossFactor = (100 - this.efficiencyPercent) / 200;
    let efficiencyLoss = amountWh * efficiencyLossFactor;
    let dumped = 0;

    if (this.currentCharge + (amountWh - efficiencyLoss) > this.sizeWh) {
      const leftToCharge = this.sizeWh - this.currentCharge;
      efficiencyLoss = leftToCharge * efficiencyLossFactor;
      dumped = amountWh - leftToCharge - efficiencyLoss;

      this.currentCharge = this.sizeWh;
    } else {
      this.currentCharge = this.currentCharge + (amountWh - efficiencyLoss);
    }

    if (this.currentCharge >= this.sizeWh / 2) {
      this.calcMinimumCharge = true;
    }

    if (this.currentCharge > this.maximumCharge) {
      this.maximumCharge = this.currentCharge;
    }

    return {
      charged: this.currentCharge - this.currentChargeOld,
      efficiencyLoss,
      dumped
    };
  }

  private removeFromStorage(amountWh: number): {
    discharged: number;
    efficiencyLoss: number;
    deficit: number;
  } {
    const efficiencyLossFactor = (100 - this.efficiencyPercent) / 200;
    let efficiencyLoss = amountWh * efficiencyLossFactor;
    let deficit = 0;

    if (this.currentCharge - (amountWh + efficiencyLoss) < 0) {
      efficiencyLoss = this.currentCharge * efficiencyLossFactor;
      deficit = amountWh - (this.currentCharge - efficiencyLoss);

      this.currentCharge = 0;
    } else {
      this.currentCharge = this.currentCharge - (amountWh + efficiencyLoss);
    }

    if (
      this.calcMinimumCharge &&
      (this.minimumCharge === undefined || this.currentCharge < this.minimumCharge)
    ) {
      this.minimumCharge = Math.max(this.currentCharge, 0);
    }

    return {
      discharged: this.currentChargeOld - this.currentCharge,
      efficiencyLoss,
      deficit
    };
  }

  /**
   * Returns minimum charge
   * At the beginning of the simulation, storage is always 0. So the calculation of the minimum charge begins,
   * when the storage has been charged with at least half of its energy
   */
  getMinimumCharge() {
    return this.minimumCharge;
  }

  getMaximumCharge() {
    return this.maximumCharge;
  }

  isEmpty(): boolean {
    return this.currentCharge === 0;
  }

  getStateOfCharge(): number {
    return this.currentCharge;
  }
}

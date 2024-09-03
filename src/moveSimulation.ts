import {IConsumptionHandler, IPriceHandler} from "./interfaces";
import {DAY_IN_MS} from "./types";
import {addHours} from "date-fns";

export class MoveSimulation {
    private priceHandler: IPriceHandler;
    private consumptionHandler: IConsumptionHandler;

    constructor(
        priceHandler: IPriceHandler,
        consumptionHandler: IConsumptionHandler,
    ) {
        this.priceHandler = priceHandler;
        this.consumptionHandler = consumptionHandler;
    }

    start(): number {
        const supportedRange = this.priceHandler.getRange();
        let totalPrice = 0;

        for (
            let current = addHours(supportedRange.from, 5).getTime();   // add some hours to be somewhere in the day
            current <= supportedRange.to.getTime();
            current += DAY_IN_MS
        ) {
            const currentTime = new Date(current);

            const consumptionsInDay = this.consumptionHandler.getConsumptionPeriodsOfDay(currentTime);

            const bestPrices = this.priceHandler.getBestPeriodOfDay(currentTime, consumptionsInDay.length);

            for (let i = 0; i < consumptionsInDay.length; i++) {
                totalPrice = bestPrices[i] + consumptionsInDay[i];
            }
        }

        return totalPrice;
    }
}
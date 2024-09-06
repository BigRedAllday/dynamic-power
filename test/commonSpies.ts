import { addHours } from "date-fns";
import { IPriceHandler } from "../src/interfaces";

export function createGetRangeSpy(priceHandler: IPriceHandler, startDate: Date, length: number) {
  jest.spyOn(priceHandler, "getRange").mockImplementation(() => {
    return {
      from: startDate,
      to: addHours(startDate, length)
    };
  });
}
import {ConsumptionHandler} from "../src/consumption";
import {EConsumptionProfiles} from "../src/types";

describe("Consumption", () => {
  it("Handles single consumption correctly", async () => {
    const consumption = new ConsumptionHandler();
    consumption.loadProfiles([EConsumptionProfiles.WASHING_MACHINE]);

    const consumption1 = consumption.getConsumption(new Date("2024-05-31T09:12:45"));
    const consumption2 = consumption.getConsumption(new Date("2024-06-01T18:12:45"));
    const consumption3 = consumption.getConsumption(new Date("2024-06-01T18:00:00"));

    expect(consumption1.consumptionWh).toBe(0);
    expect(consumption2.consumptionWh).toBe(950);
    expect(consumption3.consumptionWh).toBe(950);
  });

  it("Handles multiple consumptions correctly", async () => {
    const consumption = new ConsumptionHandler();
    consumption.loadProfiles([
      EConsumptionProfiles.WASHING_MACHINE,
      EConsumptionProfiles.REFRIGERATOR
    ]);

    const consumption1 = consumption.getConsumption(new Date("2024-05-31T09:12:45"));
    const consumption2 = consumption.getConsumption(new Date("2024-06-01T18:12:45"));
    const consumption3 = consumption.getConsumption(new Date("2024-06-01T18:00:00"));

    expect(consumption1.consumptionWh).toBe(30);
    expect(consumption2.consumptionWh).toBe(980);
    expect(consumption3.consumptionWh).toBe(980);
  });

  it("Returns correct compressed consumption for one profile", async () => {
    const consumption = new ConsumptionHandler();
    consumption.loadProfiles([
      EConsumptionProfiles.WASHING_MACHINE
    ]);

    const actual = consumption.getCompressedConsumptionsOfDay(new Date("2024-09-09T09:12:45"));  // monday
    expect(actual).toEqual([240, 110]);
  });

  it("Returns correct compressed consumption for multiple profiles", async () => {
    const consumption = new ConsumptionHandler();
    consumption.loadProfiles([
      EConsumptionProfiles.WASHING_MACHINE,
      EConsumptionProfiles.DISHWASHER
    ]);

    const actual = consumption.getCompressedConsumptionsOfDay(new Date("2024-09-09T09:12:45"));  // monday
    expect(actual).toEqual([1040, 510]);
  });
});

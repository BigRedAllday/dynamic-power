import { ConsumptionHandler } from "../src/consumption";
import { ConsumptionProfiles } from "../src/types";

describe("Consumption", () => {
  it("Handles single consumption correctly", async () => {
    const consumption = new ConsumptionHandler();
    consumption.loadProfiles([ConsumptionProfiles.WASHING_MACHINE]);

    const consumption1 = consumption.getConsumption(new Date("2024-05-31T09:12:45"));
    const consumption2 = consumption.getConsumption(new Date("2024-06-01T18:12:45"));
    const consumption3 = consumption.getConsumption(new Date("2024-06-01T18:00:00"));

    expect(consumption1).toBe(0);
    expect(consumption2).toBe(950);
    expect(consumption3).toBe(950);
  });

  it("Handles multiple consumptions correctly", async () => {
    const consumption = new ConsumptionHandler();
    consumption.loadProfiles([
      ConsumptionProfiles.WASHING_MACHINE,
      ConsumptionProfiles.REFRIGERATOR
    ]);

    const consumption1 = consumption.getConsumption(new Date("2024-05-31T09:12:45"));
    const consumption2 = consumption.getConsumption(new Date("2024-06-01T18:12:45"));
    const consumption3 = consumption.getConsumption(new Date("2024-06-01T18:00:00"));

    expect(consumption1).toBe(30);
    expect(consumption2).toBe(980);
    expect(consumption3).toBe(980);
  });
});

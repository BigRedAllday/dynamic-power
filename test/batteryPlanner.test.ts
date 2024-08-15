import { BatteryPlanner } from "../src/batteryPlanner";
import { ConsumptionHandler } from "../src/consumption";
import { ConsumptionProfiles } from "../src/types";

describe("Battery Planner", () => {
  let batteryPlanner: BatteryPlanner;
  const consumptionHandler = new ConsumptionHandler();

  beforeEach(() => {
    batteryPlanner = new BatteryPlanner(consumptionHandler);
  });

  it("GetMinCharge returns correct values  (case car weekend daytime 50 km)", async () => {
    const testTimeRange = {
      from: new Date("2023-11-25T23:00:00Z"), // midnight local time
      to: new Date("2023-11-26T22:00:00Z")
    };

    const chargePower = 1000;
    consumptionHandler.loadProfiles([ConsumptionProfiles.CAR_WEEKEND_USE_DAYTIME_50_km]);
    batteryPlanner.calculateMinCharges(chargePower, testTimeRange);

    const hs23 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T22:00:00.000Z"));
    const hs22 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T21:00:00.000Z"));
    const hs21 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T20:00:00.000Z"));
    const hs20 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T19:00:00.000Z"));
    const hs19 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T18:00:00.000Z"));
    const hs18 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T17:00:00.000Z"));
    const hs17 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T16:00:00.000Z"));
    const hs16 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T15:00:00.000Z"));
    const hs15 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T14:00:00.000Z"));
    const hs14 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T13:00:00.000Z"));
    const hs13 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T12:00:00.000Z"));
    const hs12 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T11:00:00.000Z"));
    const hs11 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T10:00:00.000Z"));
    const hs10 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T09:00:00.000Z"));
    const hs09 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T08:00:00.000Z"));
    const hs08 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T07:00:00.000Z"));
    const hs07 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T06:00:00.000Z"));
    const hs06 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T05:00:00.000Z"));
    const hs05 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T04:00:00.000Z"));
    const hs04 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T03:00:00.000Z"));
    const hs03 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T02:00:00.000Z"));
    const hs02 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T01:00:00.000Z"));
    const hs01 = batteryPlanner.getMinChargeWh(new Date("2023-11-26T00:00:00.000Z"));
    const hs00 = batteryPlanner.getMinChargeWh(new Date("2023-11-25T23:00:00.000Z"));

    expect(hs23).toBe(0);
    expect(hs22).toBe(0);
    expect(hs21).toBe(0);
    expect(hs20).toBe(0);
    expect(hs19).toBe(0);
    expect(hs18).toBe(0);
    expect(hs17).toBe(1800);
    expect(hs16).toBe(1800);
    expect(hs15).toBe(1800);
    expect(hs14).toBe(1800);
    expect(hs13).toBe(3600);
    expect(hs12).toBe(3600 - 1000);
    expect(hs11).toBe(3600 - 2000);
    expect(hs10).toBe(3600 - 3000);
    expect(hs09).toBe(0);
    expect(hs08).toBe(0);
    expect(hs07).toBe(0);
    expect(hs06).toBe(0);
    expect(hs05).toBe(0);
    expect(hs04).toBe(0);
    expect(hs03).toBe(0);
    expect(hs02).toBe(0);
    expect(hs01).toBe(0);
    expect(hs00).toBe(0);
  });

  it("GetMinCharge returns correct values  (case car to work 10 km with workday some evenings combined)", async () => {
    const testTimeRange = {
      from: new Date("2023-11-23T23:00:00Z"), // midnight local time
      to: new Date("2023-11-24T22:00:00Z")
    };

    const chargePower = 1000;
    consumptionHandler.loadProfiles([
      ConsumptionProfiles.CAR_WORKING_DAY_DRIVE_TO_WORK_10_KM,
      ConsumptionProfiles.CAR_WORKING_DAY_SOME_EVENINGS_10km
    ]);
    batteryPlanner.calculateMinCharges(chargePower, testTimeRange);

    const hs23 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T22:00:00.000Z"));
    const hs22 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T21:00:00.000Z"));
    const hs21 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T20:00:00.000Z"));
    const hs20 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T19:00:00.000Z"));
    const hs19 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T18:00:00.000Z"));
    const hs18 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T17:00:00.000Z"));
    const hs17 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T16:00:00.000Z"));
    const hs16 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T15:00:00.000Z"));
    const hs15 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T14:00:00.000Z"));
    const hs14 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T13:00:00.000Z"));
    const hs13 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T12:00:00.000Z"));
    const hs12 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T11:00:00.000Z"));
    const hs11 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T10:00:00.000Z"));
    const hs10 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T09:00:00.000Z"));
    const hs09 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T08:00:00.000Z"));
    const hs08 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T07:00:00.000Z"));
    const hs07 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T06:00:00.000Z"));
    const hs06 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T05:00:00.000Z"));
    const hs05 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T04:00:00.000Z"));
    const hs04 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T03:00:00.000Z"));
    const hs03 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T02:00:00.000Z"));
    const hs02 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T01:00:00.000Z"));
    const hs01 = batteryPlanner.getMinChargeWh(new Date("2023-11-24T00:00:00.000Z"));
    const hs00 = batteryPlanner.getMinChargeWh(new Date("2023-11-23T23:00:00.000Z"));

    expect(hs23).toBe(0);
    expect(hs22).toBe(1800);
    expect(hs21).toBe(3600);
    expect(hs20).toBe(3600);
    expect(hs19).toBe(2600);
    expect(hs18).toBe(4400);
    expect(hs17).toBe(4400);
    expect(hs16).toBe(4400);
    expect(hs15).toBe(4400);
    expect(hs14).toBe(4400);
    expect(hs13).toBe(4400);
    expect(hs12).toBe(4400);
    expect(hs11).toBe(4400);
    expect(hs10).toBe(4400);
    expect(hs09).toBe(4400);
    expect(hs08).toBe(6200);
    expect(hs07).toBe(5200);
    expect(hs06).toBe(4200);
    expect(hs05).toBe(3200);
    expect(hs04).toBe(2200);
    expect(hs03).toBe(1200);
    expect(hs02).toBe(200);
    expect(hs01).toBe(0);
    expect(hs00).toBe(0);
  });

  it("GetMinCharge throws error if planner has been initialized but no value found", async () => {
    const testTimeRange = {
      from: new Date("2023-11-23T23:00:00Z"), // midnight local time
      to: new Date("2023-11-24T22:00:00Z")
    };

    const chargePower = 1000;
    consumptionHandler.loadProfiles([ConsumptionProfiles.CAR_WORKING_DAY_DRIVE_TO_WORK_10_KM]);
    batteryPlanner.calculateMinCharges(chargePower, testTimeRange);

    const date = new Date("2023-09-24T05:00:00.000Z");
    expect(() => batteryPlanner.getMinChargeWh(date)).toThrow(
      `Min Charge not found for ${date.toISOString()}`
    );
  });

  it("GetMinCharge returns 0 if there is no blocked data in consumption", async () => {
    const testTimeRange = {
      from: new Date("2023-11-23T23:00:00Z"), // midnight local time
      to: new Date("2023-11-24T22:00:00Z")
    };

    const chargePower = 1000;
    consumptionHandler.loadProfiles([ConsumptionProfiles.REFRIGERATOR]);
    batteryPlanner.calculateMinCharges(chargePower, testTimeRange);

    // wrong time, but no matter, since there are no blocked times
    const someValue = batteryPlanner.getMinChargeWh(new Date("2023-09-24T22:00:00.000Z"));
    expect(someValue).toBe(0);
  });
});

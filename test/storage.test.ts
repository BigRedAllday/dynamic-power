import { Storage } from "../src/storage";

describe("Storage", () => {
  it("Battery full - does not store", async () => {
    const storage = new Storage(1000, 80); // charge efficiency percent: 90
    const result1 = storage.process(900, 0);
    const result2 = storage.process(500, 100);
    const result3 = storage.process(100, 50);

    expect(result1.oldBatteryChargeWh).toBe(0);
    expect(result1.newBatteryChargeWh).toBe(810);
    expect(result1.deficitWh).toBe(0);
    expect(result1.dumpedWh).toBe(0);
    expect(result1.efficiencyLossWh).toBe(90);
    expect(result1.chargedWh).toBe(810);
    expect(result1.dischargedWh).toBe(0);

    expect(result2.oldBatteryChargeWh).toBe(810);
    expect(result2.newBatteryChargeWh).toBe(1000);
    expect(result2.deficitWh).toBe(0);
    expect(result2.dumpedWh).toBe(191); // 400 - 190 * 1,1
    expect(result2.efficiencyLossWh).toBe(19); // 190 * 0,1 oder (190 * 1,1 - 190)
    expect(result2.chargedWh).toBe(190);
    expect(result2.dischargedWh).toBe(0);

    expect(result3.oldBatteryChargeWh).toBe(1000);
    expect(result3.newBatteryChargeWh).toBe(1000);
    expect(result3.deficitWh).toBe(0);
    expect(result3.dumpedWh).toBe(50);
    expect(result3.efficiencyLossWh).toBe(0);
    expect(result3.chargedWh).toBe(0);
    expect(result3.dischargedWh).toBe(0);
  });

  it("Battery empty - does not consume", async () => {
    const storage = new Storage(1000, 80);
    const result1 = storage.process(300, 0);
    const result2 = storage.process(100, 500);
    const result3 = storage.process(100, 300);

    expect(result1.oldBatteryChargeWh).toBe(0);
    expect(result1.newBatteryChargeWh).toBe(270);
    expect(result1.deficitWh).toBe(0);
    expect(result1.dumpedWh).toBe(0);
    expect(result1.efficiencyLossWh).toBe(30);
    expect(result1.chargedWh).toBe(270);
    expect(result1.dischargedWh).toBe(0);

    expect(result2.oldBatteryChargeWh).toBe(270);
    expect(result2.newBatteryChargeWh).toBe(0);
    expect(result2.deficitWh).toBe(157); // 243 were available, but needed 400
    expect(result2.dumpedWh).toBe(0);
    expect(result2.efficiencyLossWh).toBe(27); // old charge was 270, but 243 extracted
    expect(result2.chargedWh).toBe(0);
    expect(result2.dischargedWh).toBe(270);

    expect(result3.oldBatteryChargeWh).toBe(0);
    expect(result3.newBatteryChargeWh).toBe(0);
    expect(result3.deficitWh).toBe(200);
    expect(result3.dumpedWh).toBe(0);
    expect(result3.efficiencyLossWh).toBe(0);
    expect(result3.chargedWh).toBe(0);
    expect(result3.dischargedWh).toBe(0);
  });

  it("Battery medium - charges and consumes correctly", async () => {
    const storage = new Storage(1000, 80);

    // initial charge
    const result1 = storage.process(500, 0);

    // charge steps
    const result2 = storage.process(200, 100);
    const result3 = storage.process(600, 700);

    expect(result1.oldBatteryChargeWh).toBe(0);
    expect(result1.newBatteryChargeWh).toBe(450);
    expect(result1.deficitWh).toBe(0);
    expect(result1.dumpedWh).toBe(0);
    expect(result1.efficiencyLossWh).toBe(50);
    expect(result1.chargedWh).toBe(450);
    expect(result1.dischargedWh).toBe(0);

    expect(result2.oldBatteryChargeWh).toBe(450);
    expect(result2.newBatteryChargeWh).toBe(540);
    expect(result2.deficitWh).toBe(0);
    expect(result2.dumpedWh).toBe(0);
    expect(result2.efficiencyLossWh).toBe(10);
    expect(result2.chargedWh).toBe(90);
    expect(result2.dischargedWh).toBe(0);

    expect(result3.oldBatteryChargeWh).toBe(540);
    expect(result3.newBatteryChargeWh).toBe(430);
    expect(result3.deficitWh).toBe(0);
    expect(result3.dumpedWh).toBe(0);
    expect(result3.efficiencyLossWh).toBe(10);
    expect(result3.chargedWh).toBe(0);
    expect(result3.dischargedWh).toBe(110);
  });

  it("Considers consumption limit correctly", async () => {
    const storage = new Storage(5000, 80);
    storage.setConsumptionLimit(800);

    // initial charge
    storage.process(4000, 0);

    const result = storage.process(0, 1000);

    expect(result.oldBatteryChargeWh).toBe(3600);
    expect(result.newBatteryChargeWh).toBe(2720);
    expect(result.deficitWh).toBe(0);
    expect(result.dumpedWh).toBe(0);
    expect(result.efficiencyLossWh).toBe(80);
    expect(result.chargedWh).toBe(0);
    expect(result.dischargedWh).toBe(880);
  });
});

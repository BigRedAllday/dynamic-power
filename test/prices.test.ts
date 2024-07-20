import { PriceHandler } from "../src/price";

describe("Prices", () => {
  it("Returns correct prices", async () => {
    const consumptionPrice = 0.233;
    const prices = new PriceHandler(consumptionPrice);
    prices.loadPriceTable();
    const price1 = prices.getPrice(new Date("2023-05-20T12:34:45"));
    const price2 = prices.getPrice(new Date("2023-12-20T12:00:00"));

    expect(price1).toBe(consumptionPrice - 0.0017017);
    expect(price2).toBe(consumptionPrice + 0.07378);
  });

  it("Returns correct range", async () => {
    const consumptionPrice = 0.233;
    const prices = new PriceHandler(consumptionPrice);
    prices.loadPriceTable();
    const range = prices.getRange();
    expect(range.from.toISOString()).toBe("2023-04-30T22:00:00.000Z");
    expect(range.to.toISOString()).toBe("2024-04-30T21:00:00.000Z");
  });

  it("Average spot price reasonable", async () => {
    const consumptionPrice = 0.233;
    const prices = new PriceHandler(consumptionPrice);
    prices.loadPriceTable();
    const spotAverage = prices.getAveragePrice();
    expect(spotAverage).toBe(0.09535300909711976 + 0.233);
  });

  it("Throws corresponding error if price not available", async () => {
    const prices = new PriceHandler(0.233);
    prices.loadPriceTable();
    const date = new Date("2022-01-01T00:00:00");
    expect(() => prices.getPrice(date)).toThrow(`Price for ${date} not available`);
  });

  it("Throws corresponding error when price table not loaded", async () => {
    const prices = new PriceHandler(0.233);
    expect(() => prices.getPrice(new Date("2022-01-01T00:00:00"))).toThrow(
      "Price table not loaded"
    );
  });
});

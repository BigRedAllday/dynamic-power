import { PriceHandler } from "../src/price";

describe("Prices", () => {

  const consumptionPrice = 0.233;
  let prices: PriceHandler;

  beforeEach(() => {
    prices = new PriceHandler(consumptionPrice);
    prices.loadPriceTable();
  })

  it("Returns correct prices", async () => {
    const price1 = prices.getPrice(new Date("2023-05-20T12:34:45"));
    const price2 = prices.getPrice(new Date("2023-12-20T12:00:00"));

    expect(price1).toBe(consumptionPrice - 0.0017017);
    expect(price2).toBe(consumptionPrice + 0.07378);
  });

  it("Returns correct range", async () => {
    const range = prices.getRange();
    expect(range.from.toISOString()).toBe("2023-04-30T22:00:00.000Z");
    expect(range.to.toISOString()).toBe("2024-04-30T21:00:00.000Z");
  });

  it("Average spot price reasonable", async () => {
    const spotAverage = prices.getAveragePrice();
    expect(spotAverage).toBe(0.09535300909711976 + 0.233);
  });

  it("Some random periods of day return correct results", async () => {
    const bestPrices1 = prices.getBestPeriodOfDay(new Date("2023-12-17T12:00:00.000"), 8);
    expect(bestPrices1.find(p => p.date.toISOString() === "2023-12-16T23:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0539546);
    expect(bestPrices1.find(p => p.date.toISOString() === "2023-12-17T00:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.050932);
    expect(bestPrices1.find(p => p.date.toISOString() === "2023-12-17T01:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0511224);
    expect(bestPrices1.find(p => p.date.toISOString() === "2023-12-17T02:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0341411);
    expect(bestPrices1.find(p => p.date.toISOString() === "2023-12-17T03:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0313803);
    expect(bestPrices1.find(p => p.date.toISOString() === "2023-12-17T04:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0355453);
    expect(bestPrices1.find(p => p.date.toISOString() === "2023-12-17T05:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0464457);
    expect(bestPrices1.find(p => p.date.toISOString() === "2023-12-17T06:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0539189);

    const bestPrices2 = prices.getBestPeriodOfDay(new Date("2023-11-11T07:00:00.000"), 4);
    expect(bestPrices2.find(p => p.date.toISOString() === "2023-11-11T01:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.1021972);
    expect(bestPrices2.find(p => p.date.toISOString() === "2023-11-11T02:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0990199);
    expect(bestPrices2.find(p => p.date.toISOString() === "2023-11-11T03:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.0984249);
    expect(bestPrices2.find(p => p.date.toISOString() === "2023-11-11T04:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(0.1016736);

    const bestPrices3 = prices.getBestPeriodOfDay(new Date("2023-07-02T21:00:00.000"), 2);
    expect(bestPrices3.find(p => p.date.toISOString() === "2023-07-02T12:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(-0.595);
    expect(bestPrices3.find(p => p.date.toISOString() === "2023-07-02T13:00:00.000Z")!.price - consumptionPrice)
        .toBeCloseTo(-0.47481);
  });

  it("Throws corresponding error if price not available", async () => {
    const date = new Date("2022-01-01T00:00:00");
    expect(() => prices.getPrice(date)).toThrow(`Price for ${date} not available`);
  });

  it("Throws corresponding error when price table not loaded", async () => {
    expect(() => prices.getPrice(new Date("2022-01-01T00:00:00"))).toThrow(
      "Price for Sat Jan 01 2022 00:00:00 GMT+0100 (Central European Standard Time) not available"
    );
  });
});

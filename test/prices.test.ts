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
    17.12.2023 04:00  8
    0.0539546
    0.050932
    0.0511224
    0.0341411
    0.0313803
    0.0355453
    0.0464457
    0.0539189



    11.11.2023 19:00  4
    30.06.2023 16:00  2



    

    prices.getBestPeriodOfDay()
  });

  it("Throws corresponding error if price not available", async () => {
    const date = new Date("2022-01-01T00:00:00");
    expect(() => prices.getPrice(date)).toThrow(`Price for ${date} not available`);
  });

  it("Throws corresponding error when price table not loaded", async () => {
    expect(() => prices.getPrice(new Date("2022-01-01T00:00:00"))).toThrow(
      "Price table not loaded"
    );
  });
});

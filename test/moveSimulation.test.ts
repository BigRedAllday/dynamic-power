import { MoveSimulation } from "../src/moveSimulation";
import { IConsumptionHandler, IPriceHandler } from "../src/interfaces";
import { createGetRangeSpy } from "./commonSpies";


describe("Simulation with moving consumptions", () => {
  let sut: MoveSimulation;

  const priceHandler: IPriceHandler = {
    getPrice: jest.fn(),
    getAveragePrice: jest.fn(),
    getRange: jest.fn(),
    getBestPeriodOfDay: jest.fn()
  };

  const consumptionHandler: IConsumptionHandler = {
    getConsumption: jest.fn(),
    getCompressedConsumptionsOfDay: jest.fn()
  };

  beforeEach(() => {
    sut = new MoveSimulation(priceHandler, consumptionHandler);

    createGetRangeSpy(priceHandler,  new Date("2024-05-31T12:00:00.000Z"), 48); // 2 days

    jest.spyOn(priceHandler, "getBestPeriodOfDay").mockImplementation((date: Date) => {
      if (date.getDate() === 31) {
        return [
          {
            date: new Date("2024-05-31T10:00:00.000Z"),
            price: 0.12
          }
        ]
      } else if (date.getDate() === 1) {
        return [
          {
            date: new Date("2024-06-01T18:00:00.000Z"),
            price: 0.01
          },
          {
            date: new Date("2024-06-01T19:00:00.000Z"),
            price: 0.02
          },
          {
            date: new Date("2024-06-01T20:00:00.000Z"),
            price: 0.03
          },
          {
            date: new Date("2024-06-01T21:00:00.000Z"),
            price: 0.04
          }
        ]
      } else {
        throw "WTF?";
      }
    });

    jest.spyOn(consumptionHandler, "getCompressedConsumptionsOfDay").mockImplementation((date: Date) => {
      if (date.getDate() === 31) {
        return [200];
      } else if (date.getDate() === 1) {
        return [500, 800, 900];
      } else {
        throw "WTF?";
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("Adds prices and consumptions correctly", async () => {
    const result = sut.start();

    expect(result).toBe(0.2 * 0.12 + 0.5 * 0.01 + 0.8 * 0.02 + 0.9 * 0.03);
  });

});
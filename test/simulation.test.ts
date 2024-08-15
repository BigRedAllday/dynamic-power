import { Simulation } from "../src/simulation";
import { IBatteryPlanner, IConsumptionHandler, IPriceHandler } from "../src/interfaces";
import { Storage } from "../src/storage";
import { SimulationProps, SimulationType } from "../src/types";
import { addHours } from "date-fns";

describe("Simulation with storage integration", () => {
  let sut: Simulation;
  const priceHandler: IPriceHandler = {
    getPrice: jest.fn(),
    getAveragePrice: jest.fn(),
    getRange: jest.fn()
  };

  const consumptionHandler: IConsumptionHandler = {
    getConsumption: jest.fn()
  };

  const batteryPlanner: IBatteryPlanner = {
    getMinChargeWh: jest.fn()
  }

  const storage = new Storage(1000, 80);

  beforeEach(() => {
    storage.reset();
    sut = new Simulation(priceHandler, consumptionHandler, batteryPlanner, storage);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  function mockData(data: { price: number; consumption: number; consumption800?: number }[]) {
    const someStartDate = new Date("2024-05-31T12:00:00.000Z");
    jest.spyOn(priceHandler, "getPrice").mockImplementation((date: Date) => {
      for (const [index, price] of data.map((d, i) => [i, d.price] as [number, number])) {
        const date1 = date.toISOString();
        const date2 = addHours(someStartDate, index).toISOString();

        if (date1 === date2) {
          return price;
        }
      }
      throw "no price value found";
    });

    jest.spyOn(priceHandler, "getRange").mockImplementation(() => {
      return {
        from: new Date(someStartDate),
        to: addHours(someStartDate, data.length - 1)
      };
    });

    jest.spyOn(priceHandler, "getAveragePrice").mockImplementation(() => {
      // since this is a test, we do it the "simple" way
      let sumOfPrice = 0;
      for (const price of data.map(d => d.price)) {
        sumOfPrice = sumOfPrice + price;
      }
      return sumOfPrice / data.length;
    });

    jest.spyOn(consumptionHandler, "getConsumption").mockImplementation((date: Date) => {
      for (const [index, consumption] of data.map(
        (d, i) => [i, d.consumption] as [number, number]
      )) {
        const date1 = date.toISOString();
        const date2 = addHours(someStartDate, index).toISOString();

        if (date1 === date2) {
          return consumption;
        }
      }
      throw "no consumption value found";
    });

    jest.spyOn(consumptionHandler, "get800WConsumption").mockImplementation((date: Date) => {
      for (const [index, consumption800] of data.map(
        (d, i) => [i, d.consumption800] as [number, number]
      )) {
        const date1 = date.toISOString();
        const date2 = addHours(someStartDate, index).toISOString();

        if (date1 === date2) {
          return consumption800;
        }
      }
      throw "no consumption value found";
    });
  }

  it("Simulates correctly using GRID_INVERTER", async () => {
    // add initial charge (leads to 450 Wh charge including efficiency loss)
    storage.process(500, 0);

    // average price:   0,4375 (upper limit: 0.525, lowerLimit: 0,35)
    // total wh:        700 Wh
    mockData([
      { price: 0.3, consumption: 80 }, // charge       Price: 0.054    Charge: 540
      { price: 0.5, consumption: 70 }, //              Price: 0.035
      { price: 0.6, consumption: 60 }, // discharge    Price: 0        Charge: 474 (60 plus efficiency loss)
      { price: 0.7, consumption: 50 }, // discharge    Price: 0        Charge: 419
      { price: 0.5, consumption: 60 }, //              Price: 0.03
      { price: 0.4, consumption: 80 }, //              Price: 0.032
      { price: 0.3, consumption: 100 }, // charge      Price: 0.06     Charge: 509
      { price: 0.2, consumption: 200 } // charge       Price: 0.06     Charge: 599
    ]); //              Sum: 0.271

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 100,
      simulationType: SimulationType.GRID_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((700 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.271, 3);
    expect(result.maximumCharge).toBe(599);
    expect(result.minimumCharge).toBe(419);
  });

  it("Simulates correctly using STAND_ALONE_PLUS", async () => {
    // add initial charge (leads to 450 Wh charge including efficiency loss)
    storage.process(500, 0);

    // average price:   0,4375 (upper limit: 0.525, lowerLimit: 0,35)
    // total wh:        700 Wh
    mockData([
      { price: 0.3, consumption: 80 }, // charge       Price: 0.054    Charge: 540
      { price: 0.5, consumption: 70 }, // discharge    Price: 0        Charge: 463
      { price: 0.6, consumption: 60 }, // discharge    Price: 0        Charge: 397
      { price: 0.7, consumption: 50 }, // discharge    Price: 0        Charge: 342
      { price: 0.5, consumption: 60 }, // discharge    Price: 0        Charge: 276
      { price: 0.4, consumption: 80 }, // discharge    Price: 0        Charge: 188
      { price: 0.3, consumption: 100 }, // charge      Price: 0.06     Charge: 299
      { price: 0.2, consumption: 200 } // charge       Price: 0.06     Charge: 409
    ]); //                                              Sum: 0.174

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 100,
      simulationType: SimulationType.STAND_ALONE_PLUS,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((700 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.174, 3);
    expect(result.maximumCharge).toBe(540);
    expect(result.minimumCharge).toBe(188);
  });

  it("Simulates correctly using STAND_ALONE_INVERTER", async () => {
    // add initial charge (leads to 540 Wh charge including efficiency loss)
    storage.process(600, 0);

    // average price:   0,4375 (upper limit: 0.525, lowerLimit: 0,35)
    // total wh:        700 Wh
    mockData([
      { price: 0.3, consumption: 80 }, // charge       Price: 0.03    Charge: 558
      { price: 0.5, consumption: 70 }, // discharge    Price: 0       Charge: 481
      { price: 0.6, consumption: 60 }, // discharge    Price: 0       Charge: 415
      { price: 0.7, consumption: 50 }, // discharge    Price: 0       Charge: 360
      { price: 0.5, consumption: 60 }, // discharge    Price: 0       Charge: 294
      { price: 0.4, consumption: 80 }, // discharge    Price: 0       Charge: 206
      { price: 0.3, consumption: 100 }, // charge      Price: 0.03    Charge: 206
      { price: 0.2, consumption: 200 } // charge       Price: 0.02    Charge: 96
    ]); //              Sum: 0.08

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 100,
      simulationType: SimulationType.STAND_ALONE_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((700 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.08, 2);
    expect(result.maximumCharge).toBe(558);
    expect(result.minimumCharge).toBe(96);
  });

  it("Simulates correctly when battery full using GRID_INVERTER", async () => {
    // add initial charge (leads to 900)
    storage.process(1000, 0);

    // average price:   0,425 (upper limit: 0.51, lowerLimit: 0,34)
    // total wh:        260 Wh
    mockData([
      { price: 0.3, consumption: 80 }, // charge                      Price: 0.057    Charge: 1000
      { price: 0.2, consumption: 70 }, // charge (but battery full)   Price: 0.014    Charge: 1000
      { price: 0.5, consumption: 60 }, //                             Price: 0.03     Charge: 1000
      { price: 0.7, consumption: 50 } // discharge                    Price: 0        Charge: 945
    ]); //                                                            Sum: 0.101

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 200,
      simulationType: SimulationType.GRID_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((260 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.101, 3);
    expect(result.maximumCharge).toBe(1000);
    expect(result.minimumCharge).toBe(945);
  });

  it("Simulates correctly when battery full using STAND_ALONE_PLUS", async () => {
    // add initial charge
    storage.process(1000, 0);

    // average price:   0,425 (upper limit: 0.51, lowerLimit: 0,34)
    // total wh:        260 Wh
    mockData([
      { price: 0.3, consumption: 80 }, // charge                       Price: 0.057    Charge: 1000
      { price: 0.2, consumption: 70 }, // charge (but battery full)    Price: 0.014    Charge: 1000
      { price: 0.5, consumption: 60 }, // discharge                    Price: 0        Charge: 934
      { price: 0.7, consumption: 50 } // discharge                     Price: 0        Charge: 879
    ]); //                              Sum: 0.071

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 200,
      simulationType: SimulationType.STAND_ALONE_PLUS,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((260 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.071, 3);
    expect(result.maximumCharge).toBe(1000);
    expect(result.minimumCharge).toBe(879);
  });

  it("Simulates correctly when battery full using STRAND ALONE INVERTER", async () => {
    // add initial charge
    storage.process(1000, 0);

    // average price:   0,425 (upper limit: 0.51, lowerLimit: 0,34)
    // total wh:        220 Wh
    mockData([
      { price: 0.3, consumption: 40 }, // charge                       Price: 0.045     Charge: 1000
      { price: 0.2, consumption: 70 }, // charge (but battery full)    Price: 0.014     Charge: 1000
      { price: 0.5, consumption: 60 }, // discharge                    Price: 0         Charge: 934
      { price: 0.7, consumption: 50 } // discharge                     Price: 0         Charge: 879
    ]); //                                                             Sum: 0.059

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 200,
      simulationType: SimulationType.STAND_ALONE_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBeCloseTo((220 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.059, 3);
    expect(result.maximumCharge).toBe(1000);
    expect(result.minimumCharge).toBe(879);
  });

  it("Simulates correctly when battery empty using GRID_INVERTER", async () => {
    // add initial charge
    storage.process(600, 0); // activate calculation of min charge
    storage.process(0, 400); // Rest: 540 - 440 = 100 (Starting with 100 Wh)

    // average price:   0,55 (upper limit: 0.66, lowerLimit: 0,44)
    // total wh:        300 Wh
    mockData([
      { price: 0.7, consumption: 120 }, // discharge                       Price: 0.021   Charge: 0
      { price: 0.7, consumption: 70 }, // discharge (but battery empty)   Price: 0.049   Charge: 0
      { price: 0.5, consumption: 60 }, //                                 Price: 0.03    Charge: 0
      { price: 0.3, consumption: 50 } // charge                          Price: 0.045   Charge: 90
    ]); //                                                                  Sum: 0.145

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 100,
      simulationType: SimulationType.GRID_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((300 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.145, 3);
    expect(result.minimumCharge).toBe(0);
  });

  it("Simulates correctly when battery empty using STAND_ALONE_PLUS", async () => {
    // add initial charge
    storage.process(600, 0); // activate calculation of min charge
    storage.process(0, 400); // Rest: 540 - 440 = 100 (Starting with 100 Wh)

    // average price:   0,55 (upper limit: 0.66, lowerLimit: 0,44)
    // total wh:        300 Wh
    mockData([
      { price: 0.7, consumption: 120 }, // discharge                       Price: 0.021   Charge: 0
      { price: 0.7, consumption: 70 }, // discharge (but battery empty)   Price: 0.049   Charge: 0
      { price: 0.5, consumption: 60 }, //                                 Price: 0.03     Charge: 1000
      { price: 0.3, consumption: 50 } // charge                          Price: 0.045    Charge: 100
    ]); //                                                                  Sum: 0.145

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 100,
      simulationType: SimulationType.STAND_ALONE_PLUS,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((300 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.145, 3);
    expect(result.minimumCharge).toBe(0);
  });

  it("Simulates correctly when battery empty using STAND_ALONE_INVERTER", async () => {
    // add initial charge
    storage.process(600, 0); // activate calculation of min charge
    storage.process(0, 400); // Rest: 540 - 440 = 100 (Starting with 100 Wh)

    // average price:   0,55 (upper limit: 0.66, lowerLimit: 0,44)
    // total wh:        300 Wh
    mockData([
      { price: 0.7, consumption: 120 }, // discharge                       Price: 0.021   Charge: 0
      { price: 0.7, consumption: 70 }, // discharge (but battery empty)   Price: 0.049   Charge: 0
      { price: 0.5, consumption: 60 }, //                                 Price: 0.03    Charge: 0
      { price: 0.3, consumption: 50 } // charge                          Price: 0.03    Charge: 40
    ]); //                                 Sum: 0.13

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 100,
      simulationType: SimulationType.STAND_ALONE_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((300 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.13, 2);
    expect(result.minimumCharge).toBe(0);
  });

  it("GRID_INVERTER respects limitation of 800 Watt", async () => {
    // add initial charge
    storage.process(1000, 0);

    // average price:   0,5 (upper limit: 0.6, lowerLimit: 0,4)
    mockData([
      { price: 0.3, consumption: 0 }, // charge           Price: 0.033    Charge: 1000
      { price: 0.7, consumption: 1000 } // discharge        Price: 0.14     Charge: 120
    ]); //                  Sum: 0.173

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 200,
      simulationType: SimulationType.GRID_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsDynamic).toBeCloseTo(0.173, 3);
    expect(result.minimumCharge).toBeCloseTo(120, 0);
    expect(result.maximumCharge).toBe(1000);
  });

  it.each([SimulationType.STAND_ALONE_PLUS, SimulationType.STAND_ALONE_INVERTER])(
    "No limitation for STAND_ALONE inverters",
    async (simulationType: SimulationType) => {
      // add initial charge
      storage.process(1000, 0);

      // average price:   0,5 (upper limit: 0.6, lowerLimit: 0,4)
      mockData([
        { price: 0.3, consumption: 0 }, // charge           Price: 0.033     Charge: 1000
        { price: 0.7, consumption: 820 } // discharge        Price: 0       Charge: 98
      ]); //                                                Sum: 0.033

      const simulationProps: SimulationProps = {
        hysteresisChargeDischargePercent: 20,
        chargePowerWatt: 200,
        simulationType: simulationType,
        fixedPrice: 0.5
      };

      const result = sut.start(simulationProps);
      expect(result.totalCostsDynamic).toBeCloseTo(0.033, 3);
      expect(result.minimumCharge).toBeCloseTo(98, 0);
      expect(result.maximumCharge).toBe(1000);
    }
  );

  it("GRID_INVERTER calculates with 800 Watt values correctly", async () => {
    // add initial charge
    storage.process(1000, 0); // activate calculation of min charge

    // average price:   0,5 (upper limit: 0.6, lowerLimit: 0,4)
    mockData([
      { price: 0.3, consumption: 0, consumption800: 0 }, // charge              Price: 0.033   Charge: 1000
      { price: 0.7, consumption: 200, consumption800: 100 } // discharge        Price: 0.07    Charge: 890
    ]); //                  Sum: 0.103

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 200,
      simulationType: SimulationType.GRID_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsDynamic).toBeCloseTo(0.103, 3);
    expect(result.minimumCharge).toBeCloseTo(890, 3);
    expect(result.maximumCharge).toBe(1000);
  });

  it("GRID_INVERTER calculates with 800 Watt values correctly when battery empty", async () => {
    // add initial charge
    storage.process(600, 0); // activate calculation of min charge
    storage.process(0, 400); // Rest: 540 - 440 = 100 (Starting with 100 Wh)

    // average price:   0,55 (upper limit: 0.66, lowerLimit: 0,44)
    // total wh:        380 Wh
    mockData([
      { price: 0.7, consumption: 200, consumption800: 150 }, // discharge                       Price: 0.077   Charge: 0
      { price: 0.7, consumption: 70, consumption800: 60 }, // discharge (but battery empty)   Price: 0.049   Charge: 0
      { price: 0.5, consumption: 60, consumption800: 60 }, //                                 Price: 0.03
      { price: 0.3, consumption: 50, consumption800: 50 } // charge                          Price: 0.045
    ]); //                                                                                       Sum: 0.201

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: 20,
      chargePowerWatt: 100,
      simulationType: SimulationType.GRID_INVERTER,
      fixedPrice: 0.5
    };

    const result = sut.start(simulationProps);
    expect(result.totalCostsFixed).toBe((380 / 1000) * 0.5);
    expect(result.totalCostsDynamic).toBeCloseTo(0.201, 3);
    expect(result.minimumCharge).toBe(0);
  });

  it.each([SimulationType.STAND_ALONE_PLUS, SimulationType.STAND_ALONE_INVERTER])(
    "STAND_ALONE inverters ignore 800 Watt values",
    async (simulationType: SimulationType) => {
      // add initial charge (540)
      storage.process(600, 0); // activate calculation of min charge

      // average price:   0,5 (upper limit: 0.6, lowerLimit: 0,4)
      mockData([
        { price: 0.3, consumption: 0, consumption800: 0 }, // charge           Price: 0.03    Charge: 630
        { price: 0.7, consumption: 200, consumption800: 50 } // discharge        Price: 0       Charge: 410
      ]); //                  Sum: 0.03

      const simulationProps: SimulationProps = {
        hysteresisChargeDischargePercent: 20,
        chargePowerWatt: 100,
        simulationType: simulationType,
        fixedPrice: 0.5
      };

      const result = sut.start(simulationProps);
      expect(result.totalCostsDynamic).toBeCloseTo(0.03, 2);
      expect(result.minimumCharge).toBe(410);
      expect(result.maximumCharge).toBe(630);
    }
  );

  it.each([
    SimulationType.STAND_ALONE_PLUS,
    SimulationType.STAND_ALONE_INVERTER,
    SimulationType.GRID_INVERTER
  ])(
    "difference between fixed price and dynamic price should be much lower on low efficiency",
    (simulationType: SimulationType) => {
      // average price:   0,4375 (upper limit: 0.525, lowerLimit: 0,35)
      // total wh:        700 Wh
      mockData([
        { price: 0.3, consumption: 80 },
        { price: 0.5, consumption: 70 },
        { price: 0.6, consumption: 60 },
        { price: 0.7, consumption: 50 },
        { price: 0.5, consumption: 60 },
        { price: 0.4, consumption: 80 },
        { price: 0.3, consumption: 100 },
        { price: 0.2, consumption: 200 }
      ]);

      const simulationProps: SimulationProps = {
        hysteresisChargeDischargePercent: 20,
        chargePowerWatt: 200,
        simulationType: simulationType
      };

      // run 1
      const storage1 = new Storage(400, 80);
      const simulation1 = new Simulation(priceHandler, consumptionHandler, batteryPlanner, storage1);
      storage1.process(200, 0);
      const result1 = simulation1.start(simulationProps);
      const diff1 = result1.totalCostsFixed - result1.totalCostsDynamic;

      const storage2 = new Storage(400, 20);
      const simulation2 = new Simulation(priceHandler, consumptionHandler, batteryPlanner, storage2);
      storage2.process(200, 0);
      const result2 = simulation2.start(simulationProps);
      const diff2 = result2.totalCostsFixed - result2.totalCostsDynamic;

      expect(diff1).toBeGreaterThan(diff2);
    }
  );
});

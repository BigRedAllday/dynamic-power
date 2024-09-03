import { PriceHandler } from "./price";
import { ConsumptionHandler } from "./consumption";
import { BatterySimulation } from "./batterySimulation";
import { Storage } from "./storage";
import * as console from "console";
import {
  EConsumptionProfiles,
  TSimulationProps,
  TSimulationSummary,
  ESimulationType
} from "./types";
import { BatteryPlanner } from "./batteryPlanner";
import {MoveSimulation} from "./moveSimulation";

const SIMULATION_TYPE = ESimulationType.STAND_ALONE_INVERTER;
const PROFILES = [EConsumptionProfiles.WASHING_MACHINE, EConsumptionProfiles.DISHWASHER];

const START_CHARGE_POWER = 1000;
const CHARGE_POWER_STEPS = 100;
const MAX_CHARGE_POWER = 1000;

const START_STORAGE_SIZE = 10000;
const STORAGE_SIZE_STEPS = 500;
const MAX_STORAGE_SIZE = 10000;

const START_HYSTERESIS = 0;
const HYSTERESIS_STEPS = 10;
const MAX_HYSTERESIS = 80;

const TAXES = 0.233;
const EFFICIENCY_BATTERY_PERCENT = 80;

// undefined: use average price of dynamic price
const FIXED_PRICE: number | undefined = undefined;

async function main() {
  const consumptionHandler = new ConsumptionHandler();
  consumptionHandler.loadProfiles(PROFILES);
  const hasBlockedAreas = consumptionHandler.hasBlockedAreas();

  const priceHandler = new PriceHandler(TAXES);
  priceHandler.loadPriceTable();

  const batteryPlanner = new BatteryPlanner(consumptionHandler);

  let chargePowerW = START_CHARGE_POWER;
  let storageSizeWh = START_STORAGE_SIZE;
  let hysteresisDischargePercent = START_HYSTERESIS;

  let minPrice: number | undefined;
  let minPriceSimulationSummary: TSimulationSummary | undefined;

  console.log(`Average Price: ${priceHandler.getAveragePrice()}`);

  console.log("Starting battery simulation... please wait until caches are filled");

  while (
    (chargePowerW <= MAX_CHARGE_POWER ||
      storageSizeWh <= MAX_STORAGE_SIZE ||
      hysteresisDischargePercent <= MAX_HYSTERESIS) &&
    !(
      chargePowerW >= MAX_CHARGE_POWER &&
      storageSizeWh >= MAX_STORAGE_SIZE &&
      hysteresisDischargePercent >= MAX_HYSTERESIS
    )
  ) {
    if (hasBlockedAreas) {
      batteryPlanner.calculateMinCharges(chargePowerW, priceHandler.getRange());
    }

    const storage = new Storage(storageSizeWh, EFFICIENCY_BATTERY_PERCENT);
    const simulation = new BatterySimulation(priceHandler, consumptionHandler, batteryPlanner, storage);

    const simulationProps: TSimulationProps = {
      hysteresisChargeDischargePercent: hysteresisDischargePercent,
      chargePowerWatt: chargePowerW,
      simulationType: SIMULATION_TYPE,
      fixedPrice: FIXED_PRICE
    };

    const result = simulation.start(simulationProps);

    const simulationSummary: TSimulationSummary = {
      StorageSizeWh: storageSizeWh,
      ChargePowerW: chargePowerW,
      Hysteresis: hysteresisDischargePercent,
      StorageMin: storage.getMinimumCharge()?.toFixed(0),
      StorageMax: storage.getMaximumCharge().toFixed(0),
      DynamicPrice: result.totalCostsDynamic.toFixed(2),
      FixedPrice: result.totalCostsFixed.toFixed(2)
    };

    console.log(JSON.stringify(simulationSummary));

    if (minPrice === undefined || minPrice > result.totalCostsDynamic) {
      minPrice = result.totalCostsDynamic;
      minPriceSimulationSummary = simulationSummary;
    }

    chargePowerW = chargePowerW + CHARGE_POWER_STEPS;

    if (chargePowerW > MAX_CHARGE_POWER) {
      chargePowerW = START_CHARGE_POWER;
      storageSizeWh = storageSizeWh + STORAGE_SIZE_STEPS;
    }

    if (storageSizeWh > MAX_STORAGE_SIZE) {
      storageSizeWh = START_STORAGE_SIZE;
      hysteresisDischargePercent = hysteresisDischargePercent + HYSTERESIS_STEPS;
    }
  }

  console.log(" ");
  console.log("BEST RESULT:");
  console.log(minPriceSimulationSummary);

  // plot best result
  if (minPriceSimulationSummary) {
    const storage = new Storage(
      minPriceSimulationSummary.StorageSizeWh,
      EFFICIENCY_BATTERY_PERCENT
    );
    const simulation = new BatterySimulation(priceHandler, consumptionHandler, batteryPlanner, storage);
    const simulationProps: TSimulationProps = {
      hysteresisChargeDischargePercent: minPriceSimulationSummary.Hysteresis,
      chargePowerWatt: minPriceSimulationSummary.ChargePowerW,
      simulationType: SIMULATION_TYPE
    };

    simulation.start(simulationProps, true);
  }

  // move simulation
  const simulation = new MoveSimulation(priceHandler, consumptionHandler);
  const movePrice = simulation.start();
  console.log(`Price if we move consumption to best price periods: ${movePrice}`);
}

//Invoke the main function
main().catch(err => {
  console.log(err);
});

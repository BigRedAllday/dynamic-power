import { PriceHandler } from "./price";
import { ConsumptionHandler } from "./consumption";
import { Simulation } from "./simulation";
import { Storage } from "./storage";
import * as console from "console";
import {
  EConsumptionProfiles,
  TSimulationProps,
  TSimulationSummary,
  ESimulationType
} from "./types";
import { BatteryPlanner } from "./batteryPlanner";

const SIMULATION_TYPE = ESimulationType.STAND_ALONE_INVERTER;
const PROFILES = [
  EConsumptionProfiles.CAR_WORKING_DAY_DRIVE_TO_WORK_10_KM,
  EConsumptionProfiles.CAR_WEEKEND_USE_DAYTIME_50_KM,
  EConsumptionProfiles.CAR_WORKING_DAY_SOME_EVENINGS_10KM
];

const START_CHARGE_POWER = 3500; // socket
const CHARGE_POWER_STEPS = 7500;
const MAX_CHARGE_POWER = 11000; // wallbox

const START_STORAGE_SIZE = 20000;
const STORAGE_SIZE_STEPS = 10000;
const MAX_STORAGE_SIZE = 100000;

const START_HYSTERESIS = 0;
const HYSTERESIS_STEPS = 10;
const MAX_HYSTERESIS = 80;

const CONSUMPTION_PRICE = 0.233; // as of 2024-08-16
const EFFICIENCY_BATTERY_PERCENT = 90;

// added efficiency loss of battery since fixed prices do not use battery in current simulation logic
// "Fixed Price" is used as reference without battery for now, but in cars we cannot avoid batteries
// Maye this issue will be fixed in future releases
// 0.369 is current electricity price of Hamburg`s electricity provider (as of 2024-08-16)
const FIXED_PRICE: number | undefined = 0.369 * (100 / EFFICIENCY_BATTERY_PERCENT);

async function main() {
  const priceHandler = new PriceHandler(CONSUMPTION_PRICE);
  priceHandler.loadPriceTable();

  const consumptionHandler = new ConsumptionHandler();
  consumptionHandler.loadProfiles(PROFILES);
  const hasBlockedAreas = consumptionHandler.hasBlockedAreas();

  const batteryPlanner = new BatteryPlanner(consumptionHandler);

  let chargePowerW = START_CHARGE_POWER;
  let storageSizeWh = START_STORAGE_SIZE;
  let hysteresisDischargePercent = START_HYSTERESIS;

  let minPrice: number | undefined;
  let minPriceSimulationSummary: TSimulationSummary | undefined;

  console.log(`Average Price: ${priceHandler.getAveragePrice()}`);

  console.log("Starting simulation... please wait until caches are filled");

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
    const simulation = new Simulation(priceHandler, consumptionHandler, batteryPlanner, storage);

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
    const simulation = new Simulation(priceHandler, consumptionHandler, batteryPlanner, storage);
    const simulationProps: TSimulationProps = {
      hysteresisChargeDischargePercent: minPriceSimulationSummary.Hysteresis,
      chargePowerWatt: minPriceSimulationSummary.ChargePowerW,
      simulationType: SIMULATION_TYPE
    };

    simulation.start(simulationProps, true);
  }
}

//Invoke the main function
main().catch(err => {
  console.log(err);
});

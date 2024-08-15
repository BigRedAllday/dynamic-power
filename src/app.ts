import { PriceHandler } from "./price";
import { ConsumptionHandler } from "./consumption";
import { Simulation } from "./simulation";
import { Storage } from "./storage";
import * as console from "console";
import { ConsumptionProfiles, SimulationProps, SimulationType } from "./types";
import { BatteryPlanner } from "./batteryPlanner";

const SIMULATION_TYPE = SimulationType.STAND_ALONE_INVERTER;
const PROFILES = [
  ConsumptionProfiles.TV,
  ConsumptionProfiles.ROUTER,
  ConsumptionProfiles.DISHWASHER
];

const START_CHARGE_POWER = 2000;
const CHARGE_POWER_STEPS = 1000;
const MAX_CHARGE_POWER = 10000;

const START_STORAGE_SIZE = 500;
const STORAGE_SIZE_STEPS = 1000;
const MAX_STORAGE_SIZE = 10000;

const START_HYSTERESIS = 0;
const HYSTERESIS_STEPS = 10;
const MAX_HYSTERESIS = 80;

const CONSUMPTION_PRICE = 0.233;
const EFFICIENCY_BATTERY = 80;

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
  let minPriceMetadata = "no data";

  console.log(`Average Price: ${priceHandler.getAveragePrice()}`);

  while (
    chargePowerW <= MAX_CHARGE_POWER ||
    storageSizeWh <= MAX_STORAGE_SIZE ||
    hysteresisDischargePercent <= MAX_HYSTERESIS
  ) {
    if (hasBlockedAreas) {
      batteryPlanner.calculateMinCharges(chargePowerW, priceHandler.getRange());
    }

    const storage = new Storage(storageSizeWh, EFFICIENCY_BATTERY);

    const simulation = new Simulation(priceHandler, consumptionHandler, batteryPlanner, storage);

    const simulationProps: SimulationProps = {
      hysteresisChargeDischargePercent: hysteresisDischargePercent,
      chargePowerWatt: chargePowerW,
      simulationType: SIMULATION_TYPE
    };

    const result = simulation.start(simulationProps);

    let resultString = `Storage-Size: ${storageSizeWh} - `;
    resultString += `Charge-Power: ${chargePowerW} - `;
    resultString += `Hysteresis: ${hysteresisDischargePercent}% - `;
    resultString += `Storage Min: ${storage.getMinimumCharge()?.toFixed(0)} - `;
    resultString += `Storage Max: ${storage.getMaximumCharge().toFixed(0)} - `;
    resultString += `Dynamic: ${result.totalCostsDynamic.toFixed(2)} - `;
    resultString += `Fixed: ${result.totalCostsFixed.toFixed(2)}`;

    console.log(resultString);

    if (minPrice === undefined || minPrice > result.totalCostsDynamic) {
      minPrice = result.totalCostsDynamic;
      minPriceMetadata = resultString;
    }

    chargePowerW = chargePowerW + CHARGE_POWER_STEPS;

    if (chargePowerW >= MAX_CHARGE_POWER) {
      chargePowerW = START_CHARGE_POWER;
      storageSizeWh = storageSizeWh + STORAGE_SIZE_STEPS;
    }

    if (storageSizeWh >= MAX_STORAGE_SIZE) {
      storageSizeWh = START_STORAGE_SIZE;
      hysteresisDischargePercent = hysteresisDischargePercent + HYSTERESIS_STEPS;
    }
  }

  console.log(" ");
  console.log("BEST VALUE:");
  console.log(minPriceMetadata);
}

//Invoke the main function
main().catch(err => {
  console.log(err);
});

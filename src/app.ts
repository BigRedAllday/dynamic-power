import { PriceHandler } from "./price";
import { ConsumptionHandler } from "./consumption";
import { Simulation } from "./simulation";
import { Storage } from "./storage";
import console from "console";
import { ConsumptionProfiles, SimulationProps, SimulationType } from "./types";

const SIMULATION_TYPE = SimulationType.STAND_ALONE_INVERTER;

async function main() {
  const priceHandler = new PriceHandler(0.233);
  priceHandler.loadPriceTable();

  const consumptionHandler = new ConsumptionHandler();
  consumptionHandler.loadProfiles([ConsumptionProfiles.REFRIGERATOR]);

  let chargePowerW = 100;
  let storageSizeWh = 500;
  let hysteresisDischargePercent = 0;

  let minPrice: number | undefined;
  let minPriceMetadata = "no data";

  let minPrice2kwStorage: number | undefined;
  let minPrice2KwStorageMetadata = "no data";

  console.log("Average Price: " + priceHandler.getAveragePrice());

  while (chargePowerW !== 1000 || storageSizeWh !== 10000 || hysteresisDischargePercent !== 80) {
    const storage = new Storage(storageSizeWh, 80);

    const simulation = new Simulation(priceHandler, consumptionHandler, storage);

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

    if (
      storageSizeWh === 2000 &&
      (minPrice2kwStorage === undefined || minPrice2kwStorage > result.totalCostsDynamic)
    ) {
      minPrice2kwStorage = result.totalCostsDynamic;
      minPrice2KwStorageMetadata = resultString;
    }

    chargePowerW = chargePowerW + 100;

    if (chargePowerW === 1100) {
      chargePowerW = 100;
      storageSizeWh = storageSizeWh + 500;
    }

    if (storageSizeWh === 10500) {
      storageSizeWh = 500;
      hysteresisDischargePercent = hysteresisDischargePercent + 10;
    }
  }

  console.log(" ");
  console.log("BEST VALUE:");
  console.log(minPriceMetadata);

  console.log(" ");
  console.log("BEST VALUE 2kW:");
  console.log(minPrice2KwStorageMetadata);
}

//Invoke the main function
main().catch(err => {
  console.log(err);
});

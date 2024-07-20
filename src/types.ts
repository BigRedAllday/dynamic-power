export type TStorageProcessResult = {
  chargedWh: number;
  dischargedWh: number;
  efficiencyLossWh: number;
  dumpedWh: number;
  deficitWh: number;
  oldBatteryChargeWh: number;
  newBatteryChargeWh: number;
};

export enum ConsumptionProfiles {
  REFRIGERATOR = "fridge.csv",
  WASHING_MACHINE = "washing_machine.csv",
  ROUTER = "router.csv",
  TV = "tv.csv",
  DISHWASHER = "dishwasher.csv",
  HOME_OFFICE = "homeoffice.csv",
  BASE_100 = "100Watt.csv",
  BASE_200 = "200Watt.csv"
}

export enum SimulationType {
  STAND_ALONE_INVERTER,
  GRID_INVERTER,
  STAND_ALONE_PLUS
}

export type SimulationProps = {
  hysteresisChargeDischargePercent: number;
  chargePowerWatt: number;
  simulationType: SimulationType;
  fixedPrice?: number;
};

export type SimulationResult = {
  totalCostsDynamic: number;
  totalCostsFixed: number;
  minimumCharge: number | undefined;
  maximumCharge: number;
};

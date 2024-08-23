export type TStorageProcessResult = {
  chargedWh: number;
  dischargedWh: number;
  efficiencyLossWh: number;
  dumpedWh: number;
  deficitWh: number;
  oldBatteryChargeWh: number;
  newBatteryChargeWh: number;
};

export enum EConsumptionProfiles {
  REFRIGERATOR = "fridge.csv",
  WASHING_MACHINE = "washing_machine.csv",
  ROUTER = "router.csv",
  TV = "tv.csv",
  DISHWASHER = "dishwasher.csv",
  HOME_OFFICE = "homeoffice.csv",
  BASE_100 = "100Watt.csv",
  BASE_200 = "200Watt.csv",

  CAR_WORKING_DAY_DRIVE_TO_WORK_5_KM = "car_to_work_5_km.csv",
  CAR_WORKING_DAY_DRIVE_TO_WORK_10_KM = "car_to_work_10_km.csv",
  CAR_WORKING_DAY_DAYTIME_100_KM = "car_working_day_daytime_100km.csv",
  CAR_WORKING_DAY_SOME_EVENINGS_10KM = "car_working_day_some_evenings_20km.csv",
  CAR_WEEKEND_USE_DAYTIME_50_KM = "car_weekend_use_daytime_50km.csv",
  CAR_WEEKEND_USE_DAYTIME_200_KM = "car_weekend_use_daytime_200km.csv"
}

export const HOUR_IN_MS = 1000 * 60 * 60;

export enum ESimulationType {
  STAND_ALONE_INVERTER,
  GRID_INVERTER,
  STAND_ALONE_PLUS
}

export type TSimulationProps = {
  hysteresisChargeDischargePercent: number;
  chargePowerWatt: number;
  simulationType: ESimulationType;
  fixedPrice?: number;
};

export type TRange = {
  from: Date;
  to: Date;
};

export type TSimulationResult = {
  totalCostsDynamic: number;
  totalCostsFixed: number;
  minimumCharge: number | undefined;
  maximumCharge: number;
};

export type TConsumptionData = {
  consumptionWh: number;
  consumptionWh800?: number;
  isBlocked?: boolean;
};

export type TSimulationSummary = {
  StorageSizeWh: number;
  ChargePowerW: number;
  Hysteresis: number;
  StorageMin: string | undefined;
  StorageMax: string;
  DynamicPrice: string;
  FixedPrice: string;
};

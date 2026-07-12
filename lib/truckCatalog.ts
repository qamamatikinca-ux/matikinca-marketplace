export type TruckTransmission =
  | "Manual"
  | "Automatic"
  | "Automated manual"
  | "Electric direct drive";

export type TruckFuel = "Diesel" | "Electric" | "CNG / LNG" | "Hydrogen";

export type TruckModel = {
  name: string;
  from: number;
  to: number;
  transmissions: TruckTransmission[];
  fuels: TruckFuel[];
  axleConfigurations: string[];
  applications: string[];
  imageQuery?: string;
};

export type TruckBrand = {
  name: string;
  country: string;
  models: TruckModel[];
};

const YEARS_END = 2027;
const HEAVY_AXLES = ["4x2", "6x2", "6x4", "8x4"];
const MEDIUM_AXLES = ["4x2", "6x2", "6x4"];
const VOCATIONAL_AXLES = ["4x2", "4x4", "6x4", "6x6", "8x4", "8x8"];
const LIGHT_AXLES = ["4x2", "4x4"];
const LONG_HAUL = ["Tractor unit", "Long-haul", "Interlink / superlink", "Refrigerated transport"];
const DISTRIBUTION = ["Rigid truck", "Local distribution", "Dropside", "Box body", "Refrigerated body"];
const CONSTRUCTION = ["Tipper", "Mixer", "Construction", "Mining", "Lowbed / heavy haul"];
const MUNICIPAL = ["Refuse", "Fire and rescue", "Municipal", "Utility"];

const manualAndAmt: TruckTransmission[] = ["Manual", "Automated manual"];
const amtOnly: TruckTransmission[] = ["Automated manual"];
const autoAndAmt: TruckTransmission[] = ["Automatic", "Automated manual"];
const manualAutoAmt: TruckTransmission[] = ["Manual", "Automatic", "Automated manual"];
const electric: TruckTransmission[] = ["Electric direct drive"];

function model(
  name: string,
  from: number,
  to = YEARS_END,
  transmissions: TruckTransmission[] = manualAndAmt,
  fuels: TruckFuel[] = ["Diesel"],
  axleConfigurations = HEAVY_AXLES,
  applications = LONG_HAUL,
  imageQuery?: string,
): TruckModel {
  return { name, from, to, transmissions, fuels, axleConfigurations, applications, imageQuery };
}

export const truckCatalog: TruckBrand[] = [
  {
    name: "Mercedes-Benz Trucks",
    country: "Germany",
    models: [
      model("Actros", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("Actros L", 2021, 2027, amtOnly, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("Arocs", 2013, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("Atego", 2010, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, DISTRIBUTION),
      model("Axor", 2010, 2021, manualAndAmt, ["Diesel"], HEAVY_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Antos", 2012, 2021, amtOnly, ["Diesel"], MEDIUM_AXLES, DISTRIBUTION),
      model("Econic", 2010, 2027, autoAndAmt, ["Diesel", "CNG / LNG"], MEDIUM_AXLES, MUNICIPAL),
      model("Zetros", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("Unimog", 2010, 2027, autoAndAmt, ["Diesel"], ["4x4", "6x6"], [...MUNICIPAL, ...CONSTRUCTION]),
      model("eActros 300 / 400", 2021, 2027, electric, ["Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("eActros 600", 2024, 2027, electric, ["Electric"], HEAVY_AXLES, LONG_HAUL),
      model("eEconic", 2022, 2027, electric, ["Electric"], MEDIUM_AXLES, MUNICIPAL),
    ],
  },
  {
    name: "Volvo Trucks",
    country: "Sweden",
    models: [
      model("FH", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("FH16", 2010, 2027, amtOnly, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, "Heavy haul"]),
      model("FH Aero", 2024, 2027, amtOnly, ["Diesel", "Electric"], HEAVY_AXLES, LONG_HAUL),
      model("FH16 Aero", 2024, 2027, amtOnly, ["Diesel"], HEAVY_AXLES, [...LONG_HAUL, "Heavy haul"]),
      model("FM", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG", "Electric"], HEAVY_AXLES, [...LONG_HAUL, ...DISTRIBUTION]),
      model("FMX", 2010, 2027, manualAndAmt, ["Diesel", "Electric"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("FE", 2010, 2027, manualAutoAmt, ["Diesel", "CNG / LNG", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("FL", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("VM", 2010, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("VNL", 2010, 2027, autoAndAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("VNR", 2017, 2027, autoAndAmt, ["Diesel", "Electric"], ["4x2", "6x2", "6x4"], [...DISTRIBUTION, ...LONG_HAUL]),
      model("VHD", 2010, 2027, autoAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("FH Electric", 2022, 2027, electric, ["Electric"], HEAVY_AXLES, LONG_HAUL),
      model("FM Electric", 2022, 2027, electric, ["Electric"], HEAVY_AXLES, [...LONG_HAUL, ...DISTRIBUTION]),
      model("FMX Electric", 2022, 2027, electric, ["Electric"], VOCATIONAL_AXLES, CONSTRUCTION),
    ],
  },
  {
    name: "Scania",
    country: "Sweden",
    models: [
      model("P-series", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("G-series", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], HEAVY_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("R-series", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("S-series", 2016, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("L-series", 2017, 2027, autoAndAmt, ["Diesel", "CNG / LNG", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("P XT", 2017, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("G XT", 2017, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("R XT", 2017, 2027, amtOnly, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("R / S Super", 2021, 2027, amtOnly, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("Battery Electric Truck", 2020, 2027, electric, ["Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
    ],
  },
  {
    name: "MAN",
    country: "Germany",
    models: [
      model("TGX", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("TGS", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("TGM", 2010, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("TGL", 2010, 2027, manualAndAmt, ["Diesel"], LIGHT_AXLES, DISTRIBUTION),
      model("eTGX", 2024, 2027, electric, ["Electric"], HEAVY_AXLES, LONG_HAUL),
      model("eTGS", 2024, 2027, electric, ["Electric"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("eTGM", 2018, 2027, electric, ["Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("eTGL", 2025, 2027, electric, ["Electric"], LIGHT_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "DAF",
    country: "Netherlands",
    models: [
      model("XF", 2010, 2027, manualAndAmt, ["Diesel", "Electric"], HEAVY_AXLES, LONG_HAUL),
      model("CF", 2010, 2022, manualAndAmt, ["Diesel", "Electric"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("LF", 2010, 2023, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("XG", 2021, 2027, amtOnly, ["Diesel", "Electric"], HEAVY_AXLES, LONG_HAUL),
      model("XG+", 2021, 2027, amtOnly, ["Diesel", "Electric"], HEAVY_AXLES, LONG_HAUL),
      model("XD", 2022, 2027, amtOnly, ["Diesel", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("XB", 2023, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("XBC", 2023, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("XDC", 2023, 2027, amtOnly, ["Diesel", "Electric"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("XFC", 2023, 2027, amtOnly, ["Diesel", "Electric"], VOCATIONAL_AXLES, CONSTRUCTION),
    ],
  },
  {
    name: "IVECO",
    country: "Italy",
    models: [
      model("Stralis", 2010, 2020, manualAndAmt, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("S-Way", 2019, 2027, amtOnly, ["Diesel", "CNG / LNG", "Electric"], HEAVY_AXLES, LONG_HAUL),
      model("X-Way", 2017, 2027, amtOnly, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("T-Way", 2021, 2027, amtOnly, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("Trakker", 2010, 2021, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("Eurocargo", 2010, 2027, manualAutoAmt, ["Diesel", "CNG / LNG", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("Daily", 2010, 2027, manualAutoAmt, ["Diesel", "CNG / LNG", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("eDaily", 2022, 2027, electric, ["Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("S-eWay", 2023, 2027, electric, ["Electric"], HEAVY_AXLES, LONG_HAUL),
    ],
  },
  {
    name: "Renault Trucks",
    country: "France",
    models: [
      model("Premium", 2010, 2013, manualAndAmt, ["Diesel"], HEAVY_AXLES, [...LONG_HAUL, ...DISTRIBUTION]),
      model("Magnum", 2010, 2013, manualAndAmt, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("Kerax", 2010, 2013, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("Midlum", 2010, 2013, manualAutoAmt, ["Diesel"], MEDIUM_AXLES, DISTRIBUTION),
      model("T", 2013, 2027, amtOnly, ["Diesel", "Electric"], HEAVY_AXLES, LONG_HAUL),
      model("T High", 2013, 2027, amtOnly, ["Diesel", "Electric"], HEAVY_AXLES, LONG_HAUL),
      model("C", 2013, 2027, manualAndAmt, ["Diesel", "Electric"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("K", 2013, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("D", 2013, 2027, manualAutoAmt, ["Diesel", "Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("D Wide", 2013, 2027, manualAutoAmt, ["Diesel", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("E-Tech T", 2023, 2027, electric, ["Electric"], HEAVY_AXLES, LONG_HAUL),
      model("E-Tech C", 2023, 2027, electric, ["Electric"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("E-Tech D", 2020, 2027, electric, ["Electric"], MEDIUM_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Isuzu Trucks",
    country: "Japan",
    models: [
      model("N-Series / Elf", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("F-Series / Forward", 2010, 2027, manualAutoAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("FX-Series", 2010, 2027, manualAndAmt, ["Diesel"], HEAVY_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Giga / C&E Series", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("NPR", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("NQR", 2010, 2027, manualAutoAmt, ["Diesel"], LIGHT_AXLES, DISTRIBUTION),
      model("FRR / FSR / FTR / FVR", 2010, 2027, manualAutoAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
    ],
  },
  {
    name: "Hino",
    country: "Japan",
    models: [
      model("200 Series", 2010, 2027, manualAutoAmt, ["Diesel"], LIGHT_AXLES, DISTRIBUTION),
      model("300 Series / Dutro", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("500 Series / Ranger", 2010, 2027, manualAutoAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("700 Series / Profia", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("L Series", 2020, 2027, autoAndAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("XL Series", 2019, 2027, autoAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
    ],
  },
  {
    name: "FUSO",
    country: "Japan",
    models: [
      model("Canter", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("eCanter", 2017, 2027, electric, ["Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("Fighter", 2010, 2027, manualAutoAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("Super Great", 2010, 2027, manualAndAmt, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("FA / FI / FJ", 2010, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("FZ / FV", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
    ],
  },
  {
    name: "UD Trucks",
    country: "Japan",
    models: [
      model("Quon", 2010, 2027, autoAndAmt, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("Quester", 2013, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Croner", 2017, 2027, manualAutoAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("Kuzer", 2017, 2027, manualAutoAmt, ["Diesel"], LIGHT_AXLES, DISTRIBUTION),
      model("Condor", 2010, 2027, manualAutoAmt, ["Diesel"], MEDIUM_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Ford Trucks",
    country: "Türkiye",
    models: [
      model("Cargo", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("F-MAX", 2018, 2027, amtOnly, ["Diesel"], ["4x2", "6x2"], LONG_HAUL),
      model("F-LINE", 2023, 2027, amtOnly, ["Diesel"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("1846T / 1848T", 2012, 2027, amtOnly, ["Diesel"], ["4x2"], LONG_HAUL),
      model("3542D / 4142D", 2012, 2027, manualAndAmt, ["Diesel"], ["6x4", "8x4"], CONSTRUCTION),
    ],
  },
  {
    name: "FAW Trucks",
    country: "China",
    models: [
      model("J5N", 2010, 2018, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("J6P", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("J6L", 2010, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("JH6", 2016, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, LONG_HAUL),
      model("Tiger V", 2010, 2027, manualAndAmt, ["Diesel"], LIGHT_AXLES, DISTRIBUTION),
      model("Tiger V Plus", 2020, 2027, manualAndAmt, ["Diesel"], LIGHT_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "JAC Motors",
    country: "China",
    models: [
      model("N-Series", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("X-Series", 2015, 2027, manualAutoAmt, ["Diesel", "Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("K-Series", 2015, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("N55 / N75 / N90", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("N120 / N200", 2015, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
    ],
  },
  {
    name: "Foton",
    country: "China",
    models: [
      model("Auman ETX", 2010, 2020, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Auman GTL", 2012, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Auman EST-A", 2017, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("Auman EST-M", 2017, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("Aumark C", 2010, 2027, manualAutoAmt, ["Diesel"], LIGHT_AXLES, DISTRIBUTION),
      model("Aumark S", 2016, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Sinotruk / HOWO",
    country: "China",
    models: [
      model("HOWO 7", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("HOWO T5G", 2013, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("HOWO T7H", 2013, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("HOWO TX", 2019, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("HOWO MAX", 2021, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("SITRAK C7H", 2015, 2027, amtOnly, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("SITRAK G7S", 2020, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
    ],
  },
  {
    name: "Shacman",
    country: "China",
    models: [
      model("F3000", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("X3000", 2015, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("X5000", 2019, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("X6000", 2021, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("L3000", 2013, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
    ],
  },
  {
    name: "Dongfeng Trucks",
    country: "China",
    models: [
      model("KL", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("KX", 2014, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("KR", 2010, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, DISTRIBUTION),
      model("KC", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("Captain", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Tata Motors",
    country: "India",
    models: [
      model("LPT", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], MEDIUM_AXLES, DISTRIBUTION),
      model("Ultra", 2014, 2027, manualAndAmt, ["Diesel", "Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("Prima", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Signa", 2016, 2027, manualAndAmt, ["Diesel", "CNG / LNG", "Electric"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Ace / Intra", 2010, 2027, manualAutoAmt, ["Diesel", "CNG / LNG", "Electric"], LIGHT_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Ashok Leyland",
    country: "India",
    models: [
      model("Partner", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], LIGHT_AXLES, DISTRIBUTION),
      model("Boss", 2013, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], MEDIUM_AXLES, DISTRIBUTION),
      model("Ecomet", 2010, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("Captain", 2010, 2022, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("AVTR", 2020, 2027, manualAndAmt, ["Diesel", "CNG / LNG", "Electric"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
    ],
  },
  {
    name: "Eicher",
    country: "India",
    models: [
      model("Pro 2000 Series", 2015, 2027, manualAndAmt, ["Diesel", "CNG / LNG", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("Pro 3000 Series", 2013, 2027, manualAndAmt, ["Diesel", "CNG / LNG", "Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("Pro 6000 Series", 2013, 2027, manualAndAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Pro 8000 Series", 2013, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
    ],
  },
  {
    name: "BharatBenz",
    country: "India",
    models: [
      model("Medium Duty Range", 2012, 2027, manualAndAmt, ["Diesel"], MEDIUM_AXLES, DISTRIBUTION),
      model("Heavy Duty Rigid", 2012, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("Tractor Range", 2012, 2027, manualAndAmt, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("Mining Tipper", 2012, 2027, manualAndAmt, ["Diesel"], ["6x4", "8x4"], ["Tipper", "Mining", "Construction"]),
    ],
  },
  {
    name: "Hyundai Trucks",
    country: "South Korea",
    models: [
      model("Mighty EX", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("Pavise", 2019, 2027, manualAutoAmt, ["Diesel", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("Xcient", 2013, 2027, manualAndAmt, ["Diesel", "Hydrogen"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Xcient Fuel Cell", 2020, 2027, electric, ["Hydrogen"], HEAVY_AXLES, [...LONG_HAUL, ...DISTRIBUTION]),
    ],
  },
  {
    name: "Freightliner",
    country: "United States",
    models: [
      model("Cascadia", 2010, 2027, autoAndAmt, ["Diesel", "CNG / LNG"], ["4x2", "6x4"], LONG_HAUL),
      model("Columbia", 2010, 2020, manualAutoAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("Argosy", 2010, 2020, manualAndAmt, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("M2 106", 2010, 2027, manualAutoAmt, ["Diesel", "CNG / LNG", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("M2 112", 2010, 2027, manualAutoAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("114SD", 2011, 2027, manualAutoAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("122SD", 2010, 2023, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("eCascadia", 2022, 2027, electric, ["Electric"], ["4x2", "6x4"], LONG_HAUL),
      model("eM2", 2023, 2027, electric, ["Electric"], MEDIUM_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Western Star",
    country: "United States",
    models: [
      model("4700", 2010, 2021, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("4800", 2010, 2020, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("4900", 2010, 2020, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("5700XE", 2015, 2021, autoAndAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("47X", 2021, 2027, autoAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("49X", 2020, 2027, autoAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("57X", 2022, 2027, autoAndAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
    ],
  },
  {
    name: "International",
    country: "United States",
    models: [
      model("ProStar", 2010, 2017, manualAutoAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("LoneStar", 2010, 2027, manualAutoAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("LT Series", 2016, 2027, autoAndAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("RH Series", 2017, 2027, autoAndAmt, ["Diesel"], ["4x2", "6x4"], [...LONG_HAUL, ...DISTRIBUTION]),
      model("HX Series", 2016, 2027, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("HV Series", 2018, 2027, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("MV Series", 2018, 2027, manualAutoAmt, ["Diesel", "Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("CV Series", 2018, 2027, manualAutoAmt, ["Diesel"], LIGHT_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("eMV", 2021, 2027, electric, ["Electric"], MEDIUM_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Kenworth",
    country: "United States",
    models: [
      model("T680", 2012, 2027, autoAndAmt, ["Diesel", "CNG / LNG", "Electric", "Hydrogen"], ["4x2", "6x4"], LONG_HAUL),
      model("T880", 2013, 2027, manualAutoAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("W900", 2010, 2027, manualAutoAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("T800", 2010, 2027, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("T370 / T380", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("T440 / T480", 2010, 2027, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("K200", 2010, 2027, manualAndAmt, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("T610", 2016, 2027, manualAndAmt, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("T909", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, "Road train", "Heavy haul"]),
    ],
  },
  {
    name: "Peterbilt",
    country: "United States",
    models: [
      model("579", 2012, 2027, autoAndAmt, ["Diesel", "CNG / LNG", "Electric", "Hydrogen"], ["4x2", "6x4"], LONG_HAUL),
      model("567", 2013, 2027, manualAutoAmt, ["Diesel", "CNG / LNG"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("389", 2010, 2024, manualAutoAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("589", 2023, 2027, manualAutoAmt, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("548", 2021, 2027, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
      model("537", 2021, 2027, manualAutoAmt, ["Diesel", "Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("520", 2010, 2027, autoAndAmt, ["Diesel", "CNG / LNG"], MEDIUM_AXLES, MUNICIPAL),
      model("220", 2010, 2027, autoAndAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Mack Trucks",
    country: "United States",
    models: [
      model("Anthem", 2017, 2027, amtOnly, ["Diesel"], ["4x2", "6x4"], LONG_HAUL),
      model("Pinnacle", 2010, 2027, manualAndAmt, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("Granite", 2010, 2027, manualAutoAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("TerraPro", 2010, 2027, autoAndAmt, ["Diesel", "CNG / LNG"], MEDIUM_AXLES, MUNICIPAL),
      model("LR / LR Electric", 2015, 2027, autoAndAmt, ["Diesel", "Electric"], MEDIUM_AXLES, MUNICIPAL),
      model("MD Series", 2020, 2027, autoAndAmt, ["Diesel", "Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("Super-Liner", 2010, 2027, manualAndAmt, ["Diesel"], HEAVY_AXLES, [...LONG_HAUL, "Road train"]),
      model("Trident", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Titan", 2010, 2020, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, ["Heavy haul", "Mining", "Construction"]),
    ],
  },
  {
    name: "Volkswagen Truck & Bus",
    country: "Brazil",
    models: [
      model("Delivery", 2010, 2027, manualAutoAmt, ["Diesel", "Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("Constellation", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Meteor", 2020, 2027, amtOnly, ["Diesel"], HEAVY_AXLES, LONG_HAUL),
      model("e-Delivery", 2020, 2027, electric, ["Electric"], LIGHT_AXLES, DISTRIBUTION),
    ],
  },
  {
    name: "Daewoo Trucks",
    country: "South Korea",
    models: [
      model("Novus", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Maximus", 2013, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("K9 / Prima", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
    ],
  },
  {
    name: "Kamaz",
    country: "Russia",
    models: [
      model("5490", 2013, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("54901 K5", 2019, 2027, amtOnly, ["Diesel", "CNG / LNG"], HEAVY_AXLES, LONG_HAUL),
      model("6520", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("65115", 2010, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("43118", 2010, 2027, manualAndAmt, ["Diesel"], ["6x6"], [...CONSTRUCTION, ...MUNICIPAL]),
    ],
  },
  {
    name: "Tatra",
    country: "Czech Republic",
    models: [
      model("Phoenix", 2011, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("Force", 2010, 2027, manualAndAmt, ["Diesel"], ["4x4", "6x6", "8x8", "10x10"], [...CONSTRUCTION, ...MUNICIPAL]),
      model("Tactic", 2010, 2027, manualAndAmt, ["Diesel"], ["4x4", "6x6"], [...DISTRIBUTION, ...MUNICIPAL]),
    ],
  },
  {
    name: "BMC",
    country: "Türkiye",
    models: [
      model("Tuğra", 2018, 2027, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...LONG_HAUL, ...CONSTRUCTION]),
      model("Professional", 2010, 2020, manualAndAmt, ["Diesel"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...CONSTRUCTION]),
    ],
  },
  {
    name: "BYD Trucks",
    country: "China",
    models: [
      model("T5", 2015, 2027, electric, ["Electric"], LIGHT_AXLES, DISTRIBUTION),
      model("T7", 2015, 2027, electric, ["Electric"], MEDIUM_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("T8", 2015, 2027, electric, ["Electric"], VOCATIONAL_AXLES, [...DISTRIBUTION, ...MUNICIPAL]),
      model("8TT", 2019, 2027, electric, ["Electric"], ["6x4"], LONG_HAUL),
      model("ETM6", 2021, 2027, electric, ["Electric"], MEDIUM_AXLES, DISTRIBUTION),
      model("ETH8", 2023, 2027, electric, ["Electric"], HEAVY_AXLES, LONG_HAUL),
    ],
  },
  {
    name: "Tesla",
    country: "United States",
    models: [
      model("Semi", 2022, 2027, electric, ["Electric"], ["6x4"], LONG_HAUL),
    ],
  },
  {
    name: "Nikola",
    country: "United States",
    models: [
      model("Tre BEV", 2021, 2027, electric, ["Electric"], ["6x2", "6x4"], [...LONG_HAUL, ...DISTRIBUTION]),
      model("Tre FCEV", 2023, 2027, electric, ["Hydrogen"], ["6x2", "6x4"], LONG_HAUL),
    ],
  },
  {
    name: "Autocar",
    country: "United States",
    models: [
      model("ACX", 2010, 2027, autoAndAmt, ["Diesel", "CNG / LNG", "Electric"], VOCATIONAL_AXLES, MUNICIPAL),
      model("DC-64", 2019, 2027, manualAutoAmt, ["Diesel", "CNG / LNG", "Electric"], VOCATIONAL_AXLES, CONSTRUCTION),
      model("ACTT", 2010, 2027, autoAndAmt, ["Diesel", "CNG / LNG"], ["4x2", "6x4"], ["Terminal tractor", "Yard work"]),
    ],
  },
].sort((a, b) => a.name.localeCompare(b.name));

export const truckYears = Array.from({ length: 18 }, (_, index) => 2027 - index);

export function getTruckBrand(name: string) {
  return truckCatalog.find((brand) => brand.name === name) || null;
}

export function getTruckModels(brandName: string, year: number) {
  const brand = getTruckBrand(brandName);
  if (!brand) return [];
  return brand.models.filter((item) => year >= item.from && year <= item.to);
}

export function getTruckModel(brandName: string, modelName: string, year: number) {
  return getTruckModels(brandName, year).find((item) => item.name === modelName) || null;
}

export function validateTruckTransmission(
  brandName: string,
  modelName: string,
  year: number,
  transmission: string,
) {
  const selected = getTruckModel(brandName, modelName, year);
  if (!selected) {
    return {
      valid: false,
      message: "That model is not listed for the selected year. Choose the correct year or model.",
    };
  }

  if (transmission === "Converted / custom") {
    return {
      valid: true,
      requiresModificationProof: true,
      message: "A converted gearbox is allowed only when modification or engineering paperwork is uploaded.",
    };
  }

  const valid = selected.transmissions.includes(transmission as TruckTransmission);
  return {
    valid,
    requiresModificationProof: false,
    message: valid
      ? "Gearbox matches the catalogued factory options for this model and year."
      : `${brandName} ${modelName} (${year}) is not catalogued with a ${transmission.toLowerCase()} gearbox. Select one of the listed factory options or choose Converted / custom and upload supporting paperwork.`,
  };
}

export function catalogStats() {
  return {
    brands: truckCatalog.length,
    models: truckCatalog.reduce((total, brand) => total + brand.models.length, 0),
  };
}

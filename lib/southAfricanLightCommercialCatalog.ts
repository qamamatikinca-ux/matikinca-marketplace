/**
 * Common South African-market bakkie and van model families, including older
 * second-hand stock. This is a suggestion list, NOT an exhaustive registry.
 * The posting form always accepts a manually entered make/model for variants
 * that aren't in the catalogue.
 */
export type LightCommercialModel = { name: string; from: number; to?: number };
export type LightCommercialBrand = { name: string; models: LightCommercialModel[] };
const m=(name:string,from=2009,to?:number):LightCommercialModel=>({name,from,to});
export const lightCommercialCatalog:LightCommercialBrand[]=[
 {name:"Toyota",models:[m("Hilux"),m("Land Cruiser 70 Series"),m("Land Cruiser 79"),m("Quantum"),m("Hiace"),m("Dyna"),m("Proace",2022),m("Proace City",2022)]},
 {name:"Ford",models:[m("Ranger"),m("Ranger Raptor",2019),m("Transit"),m("Transit Custom",2013),m("Transit Connect"),m("Tourneo"),m("Tourneo Custom",2013),m("E-Transit",2023)]},
 {name:"Isuzu",models:[m("KB",2009,2022),m("D-Max",2013),m("D-Max Arctic",2017),m("D-Max X-Rider",2016)]},
 {name:"Volkswagen",models:[m("Amarok",2010),m("Caddy"),m("Caddy Cargo",2021),m("Transporter"),m("Transporter Kombi"),m("Caravelle"),m("Crafter"),m("Kombi"),m("ID. Buzz Cargo",2025)]},
 {name:"Nissan",models:[m("NP200",2009,2024),m("NP300 Hardbody",2009,2021),m("Navara"),m("Hardbody"),m("NV350 Urvan",2013),m("Urvan"),m("Patrol Pickup"),m("Cabstar")]},
 {name:"Mitsubishi",models:[m("Triton"),m("L200"),m("Colt"),m("Express Van")]},
 {name:"Mazda",models:[m("BT-50")]},
 {name:"Mahindra",models:[m("Pik Up"),m("Scorpio Pik Up"),m("Bolero"),m("Genio",2011),m("Jeeto",2017),m("Supro",2016)]},
 {name:"GWM",models:[m("Steed"),m("Steed 5"),m("Steed 6"),m("P-Series",2020),m("P300",2024),m("Poer",2020),m("Cannon",2020)]},
 {name:"JAC",models:[m("T6",2018),m("T8",2020),m("T9",2024),m("X200",2013)]},
 {name:"Foton",models:[m("Tunland"),m("Tunland G7",2022),m("Tunland V7",2025),m("Tunland V9",2025),m("View"),m("Gratour")]},
 {name:"LDV",models:[m("T60",2024),m("T60 Max",2024),m("Deliver 9",2024)]},
 {name:"Mercedes-Benz",models:[m("Sprinter"),m("Vito"),m("Viano"),m("V-Class",2014),m("X-Class",2017,2020),m("Citan",2012)]},
 {name:"Iveco",models:[m("Daily")]},
 {name:"Hyundai",models:[m("H-100"),m("H-1",2009,2021),m("iLoad"),m("Staria Load",2022),m("Staria",2021)]},
 {name:"Kia",models:[m("K2700"),m("K2500"),m("K-Series"),m("Tasman",2025)]},
 {name:"Renault",models:[m("Kangoo"),m("Trafic"),m("Master"),m("Express",2021),m("Alaskan",2017)]},
 {name:"Peugeot",models:[m("Partner"),m("Expert"),m("Boxer"),m("Landtrek",2022),m("Rifter",2018)]},
 {name:"Citroën",models:[m("Berlingo"),m("Dispatch"),m("Jumpy"),m("Jumper"),m("Relay")]},
 {name:"Opel",models:[m("Combo"),m("Combo Cargo"),m("Vivaro"),m("Movano")]},
 {name:"Fiat",models:[m("Fiorino"),m("Doblò"),m("Scudo"),m("Ducato"),m("Fullback",2016,2020)]},
 {name:"Suzuki",models:[m("Super Carry",2016),m("Eeco",2023),m("Carry"),m("APV")]},
 {name:"Tata",models:[m("Super Ace"),m("Xenon"),m("Ace"),m("Intra",2019)]},
 {name:"Changan",models:[m("Star"),m("Hunter",2025),m("Hunter Plus",2025),m("Star Truck")]},
 {name:"Jeep",models:[m("Gladiator",2021)]},
 {name:"BYD",models:[m("Shark 6",2025)]},
 {name:"GMC",models:[m("Sierra"),m("Savana")]},
 {name:"Chevrolet",models:[m("Utility",2009,2017),m("Montana"),m("Silverado"),m("Express")]},
 {name:"Dodge",models:[m("Ram 1500"),m("Ram 2500"),m("Promaster")]},
 {name:"DFSK",models:[m("K01"),m("K01S"),m("K07"),m("K17"),m("C31"),m("C35")]},
 {name:"Maxus",models:[m("eDeliver 3",2022),m("eDeliver 9",2022),m("Deliver 9")]},
 {name:"Other make",models:[]},
];
export const lightCommercialYears=Array.from({length:Math.max(1,new Date().getFullYear()-2009+1)},(_,i)=>new Date().getFullYear()-i);
export function getLightCommercialModels(make:string,year:number){
 return lightCommercialCatalog.find(b=>b.name.toLowerCase()===make.trim().toLowerCase())?.models
   .filter(m=>m.from<=year && (m.to===undefined||m.to>=year)).map(m=>m.name)||[];
}

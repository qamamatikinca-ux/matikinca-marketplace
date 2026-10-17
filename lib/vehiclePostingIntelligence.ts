export type VehicleCheckInput = {
 category:string;year:number;make:string;model:string;bodyType:string;condition:string;
 transmission:string;fuel:string;mileage:string;gvm:string;payload:string;
 offer:string;salePrice:string;rentalPrice:string;rentalPeriod:string;
 serviceHistory:string;description:string;photoCount:number;packageType:string;
};
export type VehicleAdvice={level:"warning"|"suggestion";message:string};
const money=(s:string)=>Number(String(s||"").replace(/[^0-9.]/g,""));
export function assessVehicleListing(x:VehicleCheckInput):VehicleAdvice[]{
 const out:VehicleAdvice[]=[];
 const warn=(message:string)=>out.push({level:"warning",message});
 const suggest=(message:string)=>out.push({level:"suggestion",message});
 const current=new Date().getFullYear();
 if(x.year>current||x.year<1950)warn("Check the manufacturing year against the registration papers.");
 if(x.category==="bakkie_van"&&x.year<2009)warn("Bakkie and van listings accept years from 2009 onwards.");
 if(!x.make.trim()||!x.model.trim())warn("Enter the exact make and model.");
 const km=Number(x.mileage);
 if(x.mileage!==""&&(!Number.isFinite(km)||km<0||km>3000000))warn("The mileage appears unusual; check the odometer reading.");
 const gvm=Number(x.gvm),payload=Number(x.payload);
 if(x.gvm&&x.payload&&Number.isFinite(gvm)&&Number.isFinite(payload)&&gvm>0&&payload>gvm)warn("Payload cannot exceed gross vehicle mass. Recheck the figures.");
 if(x.offer==="sale"||x.offer==="sale_or_rental"){if(!(money(x.salePrice)>0))warn("Enter a valid sale price.");}
 if(x.offer==="rental"||x.offer==="sale_or_rental"){
   const rate=x.offer==="rental"?x.salePrice:x.rentalPrice;
   if(!(money(rate)>0))warn("Enter a rental amount greater than zero.");
   if(!x.rentalPeriod)warn("Choose a rental period.");
 }
 if(x.photoCount<2)warn("Add two actual vehicle photos before submitting.");
 if(x.condition==="Needs attention"&&!/(fault|repair|damage|issue|needs|worn|defect)/i.test(x.description))suggest("Describe the repairs or faults buyers should know about.");
 if(x.description.trim().length<90)suggest("Add a more detailed description of maintenance, work history, faults or special features.");
 if(x.category==="truck"||x.category==="bakkie_van"){
   if(!x.fuel.trim())warn("Confirm the actual fuel or power type.");
   if(!x.transmission.trim())warn("Confirm the actual gearbox.");
   if(!x.serviceHistory.trim())suggest("State whether service records are available.");
 }
 if(x.category==="trailer"&&!x.payload)suggest("Payload capacity helps operators find suitable trailer jobs.");
 if(x.category==="mobile_unit"&&!x.description.toLowerCase().includes("power"))suggest("Explain how the mobile unit is powered or operated.");
 return out;
}
export function jobVehicleRelevance(description:string,vehicleCategory:string,bodyType:string,city:string):number{
 const text=description.toLowerCase();let score=0;
 const names=[bodyType.toLowerCase(),vehicleCategory.toLowerCase()].filter(s=>s.length>3);
 for(const n of names){if(text.includes(n))score+=4;}
 if(/refrigerat|cold chain|frozen/.test(bodyType.toLowerCase())&&/refrigerat|cold chain|frozen/.test(text))score+=5;
 if(/tautliner/.test(bodyType.toLowerCase())&&/tautliner/.test(text))score+=5;
 if(/tipper/.test(bodyType.toLowerCase())&&/tipper|aggregate|sand/.test(text))score+=4;
 if(city&&text.includes(city.toLowerCase().split(",")[0]))score+=3;
 if(/truck|trailer|vehicle|transport|freight|load|haul/.test(text))score+=1;
 return score;
}

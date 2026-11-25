export type VehicleOwnershipInput={
 annualKm:number;litresPer100Km:number;dieselRandPerLitre:number;maintenanceRandPerKm:number;
 insuranceMonthly:number;licenceAnnual:number;tyresAnnual:number;financeMonthly:number;depreciationAnnual:number;
};
export type VehicleOwnershipEstimate={
 annualFuel:number;annualMaintenance:number;annualFixed:number;annualTotal:number;monthlyTotal:number;costPerKm:number;
};
const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
/** Transparent planning model. Input costs are owner/buyer estimates; it is not a real-time model-specific quote. */
export function estimateVehicleOwnership(v:VehicleOwnershipInput):VehicleOwnershipEstimate|null{
 if(!Number.isFinite(v.annualKm)||v.annualKm<=0||v.annualKm>500000)return null;
 if(Object.values(v).some(x=>!Number.isFinite(x)||x<0))return null;
 if(v.litresPer100Km>150||v.dieselRandPerLitre>200||v.maintenanceRandPerKm>200)return null;
 const annualFuel=money(v.annualKm*v.litresPer100Km/100*v.dieselRandPerLitre);
 const annualMaintenance=money(v.annualKm*v.maintenanceRandPerKm);
 const annualFixed=money(v.insuranceMonthly*12+v.licenceAnnual+v.tyresAnnual+v.financeMonthly*12+v.depreciationAnnual);
 const annualTotal=money(annualFuel+annualMaintenance+annualFixed);
 return {annualFuel,annualMaintenance,annualFixed,annualTotal,monthlyTotal:money(annualTotal/12),costPerKm:money(annualTotal/v.annualKm)};
}

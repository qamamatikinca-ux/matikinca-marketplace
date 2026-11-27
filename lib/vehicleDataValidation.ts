/** LoadLink vehicle identity formatting. These checks detect obvious input mistakes;
 * they do not prove that an identifier belongs to the pictured vehicle.
 * Modern ISO 3779 VINs have 17 characters and never contain I, O or Q.
 * Older chassis numbers may be shorter and require document review.
 */
export type VehicleIdentityCategory="truck"|"bakkie_van"|"trailer"|"mobile_unit"|string|null;
const VIN_ALPHABET=/^[A-HJ-NPR-Z0-9]{17}$/;
const LEGACY_CHASSIS=/^[A-Z0-9]{5,17}$/;
export const normalizeVehicleIdentity=(value:string)=>value.trim().toUpperCase().replace(/\s+/g,"");
export function validateVehicleVin(value:string,year:number,category:VehicleIdentityCategory):string|null{
 // VIN format applies consistently; category is used for routing and staff review elsewhere.
 void category;
 const vin=normalizeVehicleIdentity(value);
 if(!vin)return "Enter the VIN/chassis number exactly as printed on the vehicle registration document.";
 if(!Number.isInteger(year)||year<1900||year>new Date().getFullYear()+1)
  return "Select a valid model or registration year before entering the VIN.";
 if(year>=1981){
  if(vin.length!==17)return `Modern vehicles require a 17-character VIN (currently ${vin.length}). Check the registration paper or chassis plate.`;
  if(/[IOQ]/.test(vin))return "A VIN cannot contain I, O or Q. Check the characters on the chassis plate.";
  if(!VIN_ALPHABET.test(vin))return "Use only letters A–Z (except I, O, Q) and digits 0–9; no spaces or punctuation.";
  if(/^(.)\1{16}$/.test(vin))return "This VIN appears to be a placeholder. Enter the identification number from the actual vehicle.";
 }else {
  if(!LEGACY_CHASSIS.test(vin))return "Older chassis numbers must be 5–17 letters or digits. Use the exact historic chassis number and supporting documents.";
 }
 return null;
}
export function validateVehicleRegistration(value:string):string|null{
 const reg=value.trim().toUpperCase().replace(/\s+/g," ");
 if(!reg)return "Enter the registration number shown on the licence disc or registration certificate.";
 if(!/^[A-Z0-9 -]{2,15}$/.test(reg)||reg.replace(/[^A-Z0-9]/g,"").length<2)
  return "Use 2–15 characters: letters, numbers, spaces or hyphens, matching the registration papers.";
 return null;
}
export function validateEngineNumber(value:string):string|null{
 if(!value.trim())return null;
 const engine=value.trim().toUpperCase();
 if(!/^[A-Z0-9/\-]{1,20}$/.test(engine))
  return "Engine/serial numbers must have at most 20 letters or digits (hyphens or slashes are permitted).";
 return null;
}
export function validateVehicleMeasurements(input:{
 odometerKm:string;previousOwners:string;gvmKg:string;payloadKg:string;
 rate:string;rentalRate:string;offerMode:string;
}):string|null{
 const integer=(value:string)=>/^\d+$/.test(value.trim())&&Number.isSafeInteger(Number(value));
 if(!integer(input.odometerKm)||Number(input.odometerKm)>99_999_999)
  return "Enter a whole-number odometer/usage reading between 0 and 99,999,999.";
 if(input.previousOwners.trim()&&(!integer(input.previousOwners)||Number(input.previousOwners)>100))
  return "Previous owners must be a whole number between 0 and 100.";
 for(const [label,value] of [["GVM",input.gvmKg],["Payload",input.payloadKg]] as const){
  if(value.trim()&&(!integer(value)||Number(value)<=0||Number(value)>150000))
   return `${label} must be a positive whole number of kilograms (up to 150,000 kg).`;
 }
 if(input.gvmKg.trim()&&input.payloadKg.trim()&&Number(input.payloadKg)>Number(input.gvmKg))
  return "Payload cannot exceed the vehicle's gross vehicle mass (GVM). Check both values.";
 const money=(value:string)=>/^(?:\d+)(?:\.\d{1,2})?$/.test(value.trim())&&Number(value)>0&&Number(value)<1_000_000_000;
 if(input.offerMode!=="poa"&&!money(input.rate))
  return "Enter a positive advertised price using numbers only, with up to two decimal places.";
 if(input.offerMode==="sale_or_rental"&&!money(input.rentalRate))
  return "Enter a valid positive rental rate (up to two decimal places).";
 return null;
}

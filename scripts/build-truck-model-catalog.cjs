const fs=require('fs'), ts=require(process.cwd()+'/node_modules/typescript'), vm=require('vm'),crypto=require('crypto');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/truckCatalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,module:mod});
const research=['europe','asia','other'].flatMap(n=>JSON.parse(fs.readFileSync(`data/truck-research/${n}.json`)));
const rows=mod.exports.truckCatalog.flatMap(brand=>brand.models.map(model=>{
 const r=research.find(x=>x.brand===brand.name&&x.model===model.name)||{};
 const local=r.photoLocalPath&&fs.existsSync('public'+r.photoLocalPath)?r.photoLocalPath:null;
 // References retain the photographer, source and verified generation label.
 const photo=local||r.photoUrl||null;
 return {id:crypto.createHash('sha256').update(brand.name+'|'+model.name).digest('hex').slice(0,20),brand:brand.name,model:model.name,country:brand.country,from_year:brand.name==='Hino'&&model.name==='200 Series'?2022:model.from,to_year:model.to,fuel_options:model.fuels,transmission_options:Array.from(new Set([...model.transmissions,...r.verifiedTransmission?[r.verifiedTransmission]:[]])),axle_options:model.axleConfigurations,applications:model.applications,verified_fuel:r.verifiedFuel||null,verified_transmission:r.verifiedTransmission||null,spec_source_url:r.specSourceUrl||null,photo_url:photo,photo_source_url:photo?r.photoSourceUrl:null,photo_credit:photo?r.photoCredit:null,photo_license:photo?r.photoLicense:null,photo_label:photo?r.photoModelLabel:null,photo_from_year:r.photoFromYear===r.photoToYear?null:r.photoFromYear||null,photo_to_year:r.photoFromYear===r.photoToYear?null:r.photoToYear||null,south_africa:!!r.southAfrica,catalog_version:'20261013'};
}));fs.writeFileSync('data/truck-model-catalog.json',JSON.stringify(rows,null,2)+'\n');console.log({models:rows.length,photos:rows.filter(x=>x.photo_url).length,local:rows.filter(x=>x.photo_url?.startsWith('/')).length});

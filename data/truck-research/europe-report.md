# European model reference photograph review — 13 October 2026

87 model-family records are retained. All 87 now have an identified photograph source; 14 photographs are hosted locally as WebP assets. Coverage is at model-family level, not every year, engine, cab or trim.

Local assets have been visually inspected. Manufacturer photographs carry manufacturer/body-builder credits and “reuse permission not stated”; Wikimedia Creative Commons credits are not attached to these replacement images. WebP conversion changes compression only, with no generated or modified vehicles.

## Completed missing references

- Volvo VNR: actual driving photograph extracted from the cover image of Volvo Trucks North America’s 2021 brochure. It depicts the 2017-generation tanker tractor, not the 2026 new model. Source: https://www.volvotrucks.us/media/vtna/files/shared/trucks/brochures/5434-volvo-vnr-brochure-2021-digital.pdf
- MAN eTGM: actual REWE customer truck photograph from the official MHS Truck & Bus model page. It shows the earlier generation; do not apply this photo to the newly introduced 2026 generation. Source: https://www.man.ro/en/camioane/etgm
- Renault Trucks E-Tech D: actual 16-tonne London Fire Brigade truck, photographed at customer handover in 2025. The side photograph is used rather than the group shot, making its cab and electric chassis visible. Source: https://www.renault-trucks.co.uk/press-release/london-fire-brigade-leads-the-way-with-new-electric-fleet
- Ford Trucks 3542D / 4142D: actual Ford 4142D 8x4 fitted with a Grunwald tipper, photographed on an industrial yard. This is specifically 4142D; the caption must not imply the photo is a 3542D. Source: https://grunwald.ru/en/about-news/ford-trucks-4142d-with-grunwald-superstructures/
- BMC Professional: actual IAA 2008 photograph by Elkawe, dedicated to the public domain. The source photo date is clearly stated; it is a family reference, not evidence of a specific selected listing year. Source: https://commons.wikimedia.org/wiki/File:BMC_LKW_(T%C3%BCrkei).jpg

## Corrected existing local assets

- Actros: replaced the strongly edited night promotional image with the documented South African handover of Actros 2645LS/33 at the East London factory in 2026. Source: https://www.mercedes-benz-trucks.co.za/media/press/proudly-built-in-south-africa-daimler-truck-southern-africa-reaches-milestone-with-150-000th-truck-assembled-at-east-london-plant/
- Volvo FH/FH16/FH16 Aero/FM: downloaded again from identified photograph assets on their exact South African model pages, excluding assets named CGI, 360 views and cab cutouts. Source pages and original raster asset URLs are recorded in JSON.
- Volvo FH Aero: replaced the distant aerial photograph with the manufacturer photograph showing the distinctive extended cab in a hangar.
- Volvo FMX: replaced the wheel-only close-up with an actual whole truck driving along a dusty gravel road. The downloaded “containers” and “quarry” photos showed no truck and were rejected.
- Scania R/G/S: exact original manufacturer assets were matched against the pre-existing local images by small-image pixel comparison; error scores were below 2 summed RGB mean differences. The images show real vehicles on a wooded road, waterside road and inside an industrial building respectively. Exact original URLs and Scania South Africa source pages are recorded in JSON.

## Limitations and rejected imagery

Commons direct downloads return HTTP 403 in this execution environment; their remote URLs and attribution metadata remain available for runtime delivery testing by the main task. Manufacturer download routes worked for the 14 local assets. No claim that every remote photograph has been downloaded successfully is made.

New VNR clean-background/marketing cutouts and a Renault product-page street image with potentially rendered scenery were not used. Actual brochure/customer photographs were substituted. Models with more than one documented gearbox or fuel variant retain null verified defaults; the app must ask the owner to select the actual vehicle variant.

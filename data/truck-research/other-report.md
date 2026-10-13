# Remaining truck brands: photographic research

Research date: 13 October 2026.

The companion `other.json` covers all 66 model-family entries currently present for Freightliner, Western Star, International, Kenworth, Peterbilt, Mack Trucks, Volkswagen Truck & Bus, Kamaz, Tesla, Nikola and Autocar. It contains 52 genuine photographic references, 8 manufacturer-supported fuel defaults and 2 direct-drive defaults. Missing or ambiguous values remain null.

## Source and usage rules

Photographs come from Wikimedia Commons file records that identify their photographer and reuse licence. Retain the credit, source link and licence in the model reference component or an accessible image-credit disclosure. CC BY-SA photographs retain their share-alike licence when resized or cropped. Original file paths are derived from MediaWiki's deterministic MD5 filename mapping; the Tesla Semi d/d9 path was cross-checked with a retrieved image link.

These are model-family reference photographs, not photographs of a user's particular vehicle. The supplied labels distinguish photographed examples; most unknown generation dates deliberately remain null. Do not claim that a photograph matches every manufacturing year or drivetrain in a combined family.

The shell received HTTP 403 for Commons API and upload.wikimedia.org image downloads. The web connector returned text descriptions/image markers without base64 ImageContent blocks. Therefore no local JPEG files were created. Source descriptions, file metadata, attribution and licences were checked; pixel-by-pixel visual inspection of every asset was unavailable. Test each imported URL through the preview deployment before enabling it.

## South African priorities

Freightliner Argosy and Columbia have actual South African truck photographs by Bob Adams, with CC BY-SA 2.0 licences. The Argosy reference depicts the ISX 500 from the 2012 model generation. Its manufacturer-branded regional brochure confirms diesel Cummins ISX/Detroit Series 60 engines and the newer Eaton UltraShift PLUS automated transmission. Transmission remains null at whole-family level because the selected catalog spans older variants as well.

Other assigned North American, Brazilian and Russian families have not been confirmed as common South African products; their southAfrica flags remain false. This does not imply that an individual import cannot be present in South Africa.

## Identity checks and restrictions

- Generic `Nikola Tre.jpg` is a 2024 FCEV photograph. It must never illustrate Tre BEV. The current record correctly assigns it to Tre FCEV. A second 2022 FCEV IAA photograph is a prototype and was not selected for the production-family card.
- The e-Delivery photograph is from IAA 2018 and its photo range is restricted to 2018. It must not masquerade as a 2020 or newer production model. Production-photo research remains open.
- The Tesla reference is a real early-production Pepsi Semi photographed in 2023, replacing the tempting 2018 prototype images.
- The Mack Anthem reference is the 2024 first generation. Its photo range ends in 2025 because the current manufacturer page describes a new generation.
- Kenworth `T370 / T380` uses an explicitly labelled 2015 T370 photograph, year-restricted to 2015. It is not a T380 photograph.
- The initial candidate `International RH Box Truck.jpg` is classified under ProStar on Commons and does not give a precise model description. It was excluded because model identity is ambiguous.
- The Mack Titan road-train photograph is labelled as photographed in 2009. It is a family reference, not an exact current-year example.
- The Kamaz 54901 photo is a K5 autonomous demonstrator from a 2023 road-opening event, with the photographer metadata naming Marsel Badykshin; the file record lists its author as unknown. Credit the originating Tatarstan government photo source when a fuller attribution is available.

## Unavailable verified photographs

These 14 entries have null photo fields rather than an unrelated truck, CGI, generated render or an unchecked reuse licence:

Western Star 47X; Western Star 57X; International RH Series; Kenworth T440 / T480; Kenworth T610; Peterbilt 589; Peterbilt 548; Peterbilt 537; Peterbilt 220; Mack LR / LR Electric; Volkswagen Meteor; Nikola Tre BEV; Autocar DC-64; Autocar ACTT.

Peterbilt 220 candidates exist in the Commons category, but their individual description pages could not be retrieved to verify attribution/licence. Do not infer an image licence from the category footer.

## Defaults

The manufacturer-supported defaults are Diesel for Freightliner Argosy; Electric for eCascadia, eM2, International eMV, Tesla Semi, Volkswagen e-Delivery and Nikola Tre BEV; Hydrogen for Nikola Tre FCEV. International eMV and Tesla Semi explicitly document direct electric drive/no transmission. Other gearbox defaults remain null where manual, automatic and automated alternatives vary by year or exact version.

The catalog's grouped names and multienergy families are too broad for a universally correct gearbox/fuel choice. Ask the owner to confirm the powertrain where the family has multiple options. Autocar E-ACX, for example, documents a two-speed electric axle; being electric does not prove that every truck uses direct drive.

Primary spec URLs are recorded in the JSON for the defaults and relevant model pages. Photo descriptions were not used as authority for whole-family mechanical defaults.


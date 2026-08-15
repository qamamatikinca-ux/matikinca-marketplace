from pathlib import Path

path = Path("app/list-your-vehicle/page.tsx")
text = path.read_text(encoding="utf-8")

# Keep the approved Driver Portal structure and only change the vehicle entry flow.
old_description = "Browse approved trucks, trailers and mobile units, or choose what you want to list and continue through the correct LoadLink flow."
new_description = "Browse approved trucks, trailers and mobile units or create your own LoadLink vehicle listing."
if old_description in text:
    text = text.replace(old_description, new_description, 1)
elif new_description not in text:
    raise SystemExit("Vehicle hero description marker was not found.")

old_cta = "List a vehicle or mobile unit"
if old_cta in text:
    text = text.replace(old_cta, "List your vehicle", 1)
elif "List your vehicle" not in text:
    raise SystemExit("Vehicle hero CTA marker was not found.")

choice_start = '      {listingFlowOpen && !listingIntent && !dealerPost ? (\n'
choice_end = '      {listingFlowOpen && listingIntent && !signedIn ?'
start = text.find(choice_start)
end = text.find(choice_end, start if start >= 0 else 0)
if start < 0 or end < 0:
    raise SystemExit("Vehicle listing-choice flow markers were not found.")

choice_block = '''      {listingFlowOpen && !listingIntent && !dealerPost ? (
        <section id="vehicle-listing-choice" className={`scroll-mt-24 border-b px-4 py-8 md:px-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-3xl font-black tracking-[-.04em]">What do you want to list?</h2>
            <p className={`mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Choose the exact listing type first. Seller and package options only appear after this choice.</p>
            <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => {
                setListingIntent("vehicle");
                chooseCategory("truck");
                setSelectedPlan(null);
                setPackageType("standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`min-h-28 rounded-2xl border p-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <span className="block text-xl font-black">Truck</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Commercial trucks and tractor units.</span>
              </button>
              <button type="button" onClick={() => {
                setListingIntent("vehicle");
                chooseCategory("trailer");
                setSelectedPlan(null);
                setPackageType("standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`min-h-28 rounded-2xl border p-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <span className="block text-xl font-black">Trailer</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Commercial trailer listings.</span>
              </button>
              <button type="button" onClick={() => {
                setListingIntent("mobile_unit");
                chooseCategory("mobile_unit");
                setSelectedPlan(null);
                setPackageType("standard");
                window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
              }} className={`min-h-28 rounded-2xl border p-5 text-left transition ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`}>
                <span className="block text-xl font-black">Mobile Unit</span>
                <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Mobile fridge, kitchen, clinic, office and other units.</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

'''
text = text[:start] + choice_block + text[end:]

# The listing type was already chosen in the entry step, so do not ask for it a second time inside the form.
form_category_start = '        <section id="vehicle-type" className={`scroll-mt-24 overflow-hidden rounded-2xl border ${surface}`}>\n'
form_category_end = '        {categoryChosen ? <>\n'
fs = text.find(form_category_start)
fe = text.find(form_category_end, fs if fs >= 0 else 0)
if fs < 0 or fe < 0:
    raise SystemExit("Repeated category section markers were not found.")
text = text[:fs] + text[fe:]

# Renumber the remaining form steps after removing the duplicate category step.
text = text.replace('SectionHeading step="02" title={`${categoryLabel(vehicleCategory!)} identity`}', 'SectionHeading step="01" title={`${categoryLabel(vehicleCategory!)} identity`}', 1)
text = text.replace('SectionHeading step="03" title="Vehicle details"', 'SectionHeading step="02" title="Vehicle details"', 1)
text = text.replace('SectionHeading step="04" title="Photos and verification"', 'SectionHeading step="03" title="Photos and verification"', 1)
text = text.replace('SectionHeading step="05" title="Contact and confirmation"', 'SectionHeading step="04" title="Contact and confirmation"', 1)

# Entering either public route should always show the hero first, not a restored mid-flow scroll position.
anchor = '  const specSchema = useMemo(() => unitSpecSchema(vehicleCategory, bodyType || vehicleSubtype), [bodyType, vehicleCategory, vehicleSubtype]);\n\n'
scroll_effect = '''  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

'''
if scroll_effect not in text:
    if anchor not in text:
        raise SystemExit("Vehicle page effect insertion marker was not found.")
    text = text.replace(anchor, anchor + scroll_effect, 1)

path.write_text(text, encoding="utf-8")
print("Vehicle portal now opens like Driver Portal, then asks Truck / Trailer / Mobile Unit before seller and package steps.")

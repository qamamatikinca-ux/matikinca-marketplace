import LegalPage, { LegalList, LegalNote } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Marketplace Rules",
  description: "Rules for listings, profiles, messaging and conduct on LoadLink.",
};

export default function MarketplaceRulesPage() {
  return (
    <LegalPage
      eyebrow="LoadLink marketplace standards"
      title="Marketplace Rules"
      summary="These rules define what may be posted and how users must behave across LoadLink jobs, contracts, commercial vehicles, mobile units, drivers, dealerships, messages, quotes and reviews."
      sections={[
        {
          id: "principles",
          title: "Marketplace principles",
          content: <><p>LoadLink is built for genuine logistics and commercial-vehicle activity. Content must be truthful, relevant, lawful and posted by someone with authority to offer it.</p><LegalNote>Moderation is risk-based. Approval means the content met LoadLink's marketplace rules at the time of review; it is not a guarantee that every statement is independently verified.</LegalNote></>,
        },
        {
          id: "listing-accuracy",
          title: "Accurate listings",
          content: <LegalList><li>Use a clear title that describes the actual opportunity or asset.</li><li>Use accurate location, route, price/rate, date and equipment information.</li><li>Do not advertise one price merely to attract users and then require a materially different undisclosed price.</li><li>Do not use unrelated photos, copied photos without permission or images that materially misrepresent condition.</li><li>Update, close or remove a listing when it is no longer available.</li><li>Do not hide mandatory commercial terms inside misleading wording.</li></LegalList>,
        },
        {
          id: "jobs-contracts",
          title: "Jobs and contracts",
          content: <LegalList><li>The poster must have authority to offer the work or solicit the service.</li><li>State the required vehicle/unit and material route, cargo, timing and payment information as accurately as reasonably possible.</li><li>Do not publish fake jobs to collect contact details, deposits or documents.</li><li>Do not describe an employment role as an independent contract merely to evade legal obligations.</li><li>Do not request unlawful transport, cargo handling or regulatory conduct.</li></LegalList>,
        },
        {
          id: "vehicles",
          title: "Vehicles and mobile units",
          content: <LegalList><li>You must own the asset or have lawful authority to advertise it.</li><li>Disclose known material issues that would make the listing materially misleading if omitted.</li><li>Do not alter an odometer, registration, VIN/chassis identifier, ownership record or document to mislead a buyer.</li><li>Use the correct stock status and mark sold/reserved stock appropriately.</li><li>Dealerships must keep dealer stock linked to the correct dealership and responsible staff account.</li></LegalList>,
        },
        {
          id: "drivers",
          title: "Driver profiles",
          content: <LegalList><li>Licence codes, experience, availability, location and vehicle experience must be truthful.</li><li>Verification documents must belong to the person submitting them and may not be forged, edited to deceive or borrowed from another driver.</li><li>Do not publish sensitive identity or document numbers in public biography fields.</li><li>A driver profile must not be used to impersonate or recruit on behalf of an unrelated person without authority.</li></LegalList>,
        },
        {
          id: "dealerships",
          title: "Dealerships",
          content: <LegalList><li>Dealership identity, location and contact details must be accurate.</li><li>Staff may act only within permissions granted to their account.</li><li>Dealer promotions, status updates and campaigns must relate to genuine stock or dealership activity.</li><li>Do not manipulate lead, review, view or response statistics.</li><li>Dealer verification may be paused if business information becomes outdated or a material trust concern arises.</li></LegalList>,
        },
        {
          id: "messaging",
          title: "Messaging and quotes",
          content: <LegalList><li>Use LoadLink messages for legitimate marketplace communication.</li><li>No spam, bulk unsolicited solicitation, harassment, threats or discriminatory abuse.</li><li>No phishing, malicious links, credential requests or malware.</li><li>Structured quotes and rate breakdowns must not deliberately misrepresent the price, VAT position, validity period or scope.</li><li>Do not use messages to coordinate platform fraud or manipulate reviews/reports.</li></LegalList>,
        },
        {
          id: "fraud",
          title: "Fraud and prohibited schemes",
          content: <LegalList><li>Advance-fee scams, fake deposits, false proof of payment and banking-detail substitution are prohibited.</li><li>Stolen vehicles, unlawful goods and deliberately fraudulent opportunities are prohibited.</li><li>Creating multiple accounts to evade restrictions, moderation or plan limits is prohibited.</li><li>Buying, selling or transferring verified accounts or verification status is prohibited.</li><li>Automated scraping, credential attacks and bypassing rate limits or access controls are prohibited.</li></LegalList>,
        },
        {
          id: "reviews-reports",
          title: "Reviews and reports",
          content: <><p>Reviews and reports must be submitted in good faith. Users may describe genuine experiences and safety concerns, but may not fabricate incidents, coordinate false reporting or threaten a negative report/review to obtain money or an unrelated benefit.</p><p>LoadLink may preserve report evidence, correlate abuse signals and restrict accounts that weaponise the reporting system.</p></>,
        },
        {
          id: "moderation",
          title: "Moderation outcomes",
          content: <><p>Depending on severity and history, LoadLink may request changes, reject content, reduce visibility, remove a listing, pause verification, restrict marketplace capabilities, suspend an account or permanently block access.</p><p>LoadLink may act immediately where there is a credible fraud, security, safety or legal risk. Less serious listing-quality issues will normally be handled through a correction flow where practical.</p></>,
        },
        {
          id: "appeals",
          title: "Questions and appeals",
          content: <p>If you believe moderation was applied incorrectly, use the Help or Contact page and provide the relevant listing/account reference. Appeals do not guarantee restoration, but LoadLink will consider material information that was not available during the original decision.</p>,
        },
      ]}
    />
  );
}

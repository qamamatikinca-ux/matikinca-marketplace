import LegalPage, { LegalList, LegalNote } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Safety Centre",
  description: "Practical safety guidance for LoadLink marketplace users.",
};

export default function SafetyPage() {
  return (
    <LegalPage
      eyebrow="LoadLink trust & safety"
      title="Safety Centre"
      summary="LoadLink provides verification, moderation, reporting and secure marketplace tools, but every commercial transaction still deserves careful checks. Use this guidance before committing money, vehicles, cargo, labour or sensitive documents."
      sections={[
        {
          id: "before-deal",
          title: "Before you agree to a deal",
          content: <LegalList><li>Confirm the other party's identity and business details using more than one reliable source where the value or risk justifies it.</li><li>Keep important commercial terms in writing: price/rate, VAT position, payment terms, route, cargo, equipment, dates, responsibilities and cancellation terms.</li><li>Be cautious when someone creates artificial urgency, refuses reasonable verification or demands payment through an unusual channel.</li><li>Do not share passwords, one-time passwords, banking PINs or authentication recovery codes.</li><li>Use the LoadLink listing and conversation as a record of what was represented.</li></LegalList>,
        },
        {
          id: "vehicles",
          title: "Buying or hiring a vehicle or unit",
          content: <><LegalList><li>Inspect the vehicle or unit physically, or arrange a qualified independent inspection if you cannot inspect it yourself.</li><li>Check identifying information and ownership/authority documents appropriate to the transaction.</li><li>Confirm condition, odometer/usage, service history and material defects directly.</li><li>Confirm the seller or dealership is entitled to sell or hire the asset.</li><li>Do not rely on a photo, badge or marketplace description as a substitute for your own due diligence.</li></LegalList><LegalNote>A LoadLink verification label explains a platform check; it is not a mechanical inspection, roadworthy certificate, ownership guarantee or finance approval unless LoadLink explicitly says so.</LegalNote></>,
        },
        {
          id: "jobs-contracts",
          title: "Jobs and contracts",
          content: <LegalList><li>Confirm the legal name and authority of the person or business offering the work.</li><li>Verify collection/delivery points, cargo, required equipment, insurance responsibilities, permits and operating requirements.</li><li>Agree the rate unit clearly: per load, kilometre, ton, day, month or other basis.</li><li>Confirm when and how payment becomes due, whether VAT applies, and what proof of delivery or supporting records are required.</li><li>For substantial or long-term work, consider a written contract and independent professional advice.</li></LegalList>,
        },
        {
          id: "drivers",
          title: "Driver safety and hiring",
          content: <><p>Driver profiles can show professional information and LoadLink review status. Employers, contractors and vehicle owners remain responsible for the hiring and operational checks required for their work.</p><LegalList><li>Confirm licence validity and the code required for the vehicle.</li><li>Confirm any professional driving permit or other legal requirement applicable to the role.</li><li>Verify experience and references when material to the work.</li><li>Do not request or retain more personal information than is reasonably necessary.</li></LegalList></>,
        },
        {
          id: "payments",
          title: "Payment safety",
          content: <LegalList><li>Verify banking details through a trusted channel before making a significant payment.</li><li>Treat sudden banking-detail changes as high risk and independently confirm them.</li><li>Never rely solely on a screenshot or forwarded payment confirmation.</li><li>Do not pay a third-party account merely because a marketplace user asks you to do so without a clear lawful reason.</li><li>Keep invoices, contracts, proof of payment and relevant conversation records.</li></LegalList>,
        },
        {
          id: "messages-files",
          title: "Messages, links and files",
          content: <LegalList><li>Be cautious with unexpected links, executable files and documents asking you to re-enter credentials.</li><li>LoadLink will not ask for your password or banking PIN through a marketplace chat.</li><li>Do not open a file merely because it appears to be an invoice, quotation or proof of payment.</li><li>Use block/report controls where a conversation becomes abusive, suspicious or manipulative.</li></LegalList>,
        },
        {
          id: "verification",
          title: "Understand verification labels",
          content: <><p>LoadLink uses specific verification language so users can understand what was actually checked. Depending on the feature, labels may include Identity verified, Dealership verified, Driver profile approved, Documents reviewed or Listing reviewed.</p><p>A label should never be interpreted as a broader guarantee than its stated meaning.</p></>,
        },
        {
          id: "report",
          title: "Report suspicious activity",
          content: <><p>Use <strong>Report listing</strong> on a listing when you suspect a scam, misleading price, duplicate, incorrect information, inappropriate content or an unavailable listing. Signed-in reports are recorded with a LoadLink reference and can be reviewed by authorised staff.</p><p>For account or conversation concerns, use the available block/report/support tools and preserve any relevant evidence.</p></>,
        },
        {
          id: "emergency",
          title: "Emergencies and criminal conduct",
          content: <p>LoadLink is not an emergency service. If there is an immediate threat to life, physical safety, cargo or property, contact the appropriate emergency service or law-enforcement authority. Serious suspected criminal conduct can also be reported to LoadLink so the platform can preserve relevant records and take account-level action where appropriate.</p>,
        },
      ]}
    />
  );
}

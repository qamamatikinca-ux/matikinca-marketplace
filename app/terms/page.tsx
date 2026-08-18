import LegalPage, { LegalList, LegalNote } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Terms of Use",
  description: "Terms governing access to and use of the LoadLink logistics marketplace.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      summary="These Terms govern access to LoadLink, including marketplace listings, driver and dealership profiles, messaging, logistics tools, paid plans and related services. Please read them before using the platform."
      notice={<>Nothing in these Terms is intended to exclude or limit a right or remedy that cannot lawfully be excluded under South African law, including applicable consumer-protection rights.</>}
      sections={[
        {
          id: "agreement",
          title: "Agreement and eligibility",
          content: <><p>By creating an account, posting content, sending a message, purchasing a LoadLink service or otherwise using the platform, you agree to these Terms and the policies incorporated into them.</p><p>You must be at least 18 years old, have legal capacity to enter into these Terms, and have authority to act for any business, fleet, dealership or other organisation you represent.</p></>,
        },
        {
          id: "marketplace-role",
          title: "LoadLink's marketplace role",
          content: <><p>LoadLink provides technology that helps users discover logistics opportunities, commercial vehicles and mobile units, professional drivers, dealerships and business counterparties, and helps them communicate.</p><p>Unless LoadLink expressly states otherwise for a specific service, LoadLink is not the buyer, seller, carrier, employer, broker, insurer, finance provider or contracting party in a transaction between marketplace users. Users are responsible for deciding whether to transact and for documenting the final commercial agreement.</p><LegalNote>Verification, moderation, badges, fraud signals and safety tools reduce risk but do not guarantee the identity, solvency, legal authority, vehicle condition, availability, performance or conduct of another user.</LegalNote></>,
        },
        {
          id: "accounts",
          title: "Accounts and security",
          content: <LegalList><li>Provide accurate, current information and keep it updated.</li><li>Keep passwords, verification codes and account access confidential.</li><li>Do not sell, transfer or share an account in a way that bypasses LoadLink controls.</li><li>Notify LoadLink promptly if you believe an account or credential has been compromised.</li><li>Complete identity, business, dealership, driver or other verification when required for a feature.</li></LegalList>,
        },
        {
          id: "listings",
          title: "Listings, jobs and contracts",
          content: <><p>If you publish a listing, you are responsible for its accuracy and legality. You must have the right and authority to offer the opportunity, vehicle, unit or service advertised.</p><LegalList><li>Prices, rates, dates, routes, specifications, payment terms and availability must not be deliberately misleading.</li><li>Vehicle and equipment sellers must disclose material information they know is relevant to a reasonable buyer's decision.</li><li>Job and contract posters are responsible for lawful operating requirements, permits, insurance, cargo requirements, employment obligations and commercial terms applicable to their work.</li><li>Listings may be reviewed, rejected, paused, expired, de-ranked or removed under the Marketplace Rules.</li></LegalList></>,
        },
        {
          id: "drivers-dealers",
          title: "Drivers and dealerships",
          content: <><p>Driver and dealership approval is a platform-access and trust process; it is not a guarantee of future performance. Drivers remain responsible for valid licences, professional requirements and accurate experience information. Dealerships remain responsible for their stock, staff activity, pricing and customer dealings.</p><p>Public verification labels describe the particular check LoadLink says it completed. They must not be interpreted more broadly than their displayed meaning.</p></>,
        },
        {
          id: "messages-tools",
          title: "Messages and logistics tools",
          content: <><p>LoadLink messaging and structured tools can help users exchange enquiries, quotes, vehicle information, route details and other commercial information. Users remain responsible for reviewing what they send and for confirming the final agreement.</p><p>You may not use messaging to spam, harass, distribute malware, impersonate others, solicit unlawful payments, scrape contact information or bypass marketplace safety controls.</p></>,
        },
        {
          id: "plans-payments",
          title: "Paid plans, promotions and payments",
          content: <><p>Where LoadLink charges for a plan, listing benefit, promotion or other service, the price, billing period and included features shown at checkout form part of the purchase terms. Taxes may apply where required.</p><p>Entitlements are activated only after LoadLink receives or verifies the relevant payment status. Refunds, cancellations and cooling-off rights will be handled in accordance with the purchase terms and any rights that apply under South African law.</p><p>Promoted placement improves visibility but does not guarantee views, leads, sales, employment, contract awards or revenue.</p></>,
        },
        {
          id: "prohibited",
          title: "Prohibited conduct",
          content: <LegalList><li>Fraud, scams, impersonation, money laundering or deceptive payment instructions.</li><li>Listings for stolen, unlawful or misrepresented vehicles, goods, services or opportunities.</li><li>Discrimination, harassment, threats or abusive content.</li><li>Automated scraping, credential attacks, reverse engineering of security controls or interference with platform availability.</li><li>Uploading malicious files or attempting to obtain another user's confidential information.</li><li>Manipulating reviews, verification, analytics, leads, views or marketplace ranking.</li><li>Using LoadLink in breach of applicable transport, employment, consumer, privacy, tax or other laws.</li></LegalList>,
        },
        {
          id: "moderation",
          title: "Moderation, restrictions and suspension",
          content: <><p>LoadLink may investigate reports and platform signals, request information, restrict features, remove content, suspend an account or terminate access where reasonably necessary to protect users, enforce these Terms, comply with law or respond to a material security or payment issue.</p><p>Where appropriate, LoadLink may provide a reason and a path to correct or appeal a decision. Serious fraud, security threats or legal requirements may require immediate action.</p></>,
        },
        {
          id: "content-ip",
          title: "Content and intellectual property",
          content: <><p>You retain ownership of content you lawfully own. You grant LoadLink a non-exclusive licence to host, reproduce, resize, format, display and distribute content as reasonably necessary to operate, secure, market and improve the platform and your listing or profile.</p><p>You may not upload content that infringes another person's intellectual-property, privacy or publicity rights. LoadLink's brand, software, interface and original platform materials remain protected by applicable intellectual-property laws.</p></>,
        },
        {
          id: "liability",
          title: "Responsibility and liability",
          content: <><p>LoadLink will provide the platform with reasonable care but cannot promise uninterrupted availability or that every user-generated statement is accurate. Internet, payment, identity, hosting and third-party services can experience failures outside LoadLink's control.</p><p>To the maximum extent permitted by law, LoadLink is not responsible for indirect or consequential loss arising from a transaction between users, or for a user's failure to inspect, verify, insure, document or perform a transaction. This clause does not exclude liability that cannot lawfully be excluded, including rights or remedies that apply under the Consumer Protection Act where applicable.</p></>,
        },
        {
          id: "privacy",
          title: "Privacy and electronic communications",
          content: <><p>LoadLink processes personal information as described in the Privacy Policy. Electronic notices, confirmations and agreements may be delivered through the platform, email, SMS or other electronic channels permitted by law.</p><p>Marketing communications are subject to applicable consent and opt-out requirements. Transactional, safety and account-security notices may still be sent where necessary to provide the service.</p></>,
        },
        {
          id: "law-changes",
          title: "South African law and changes",
          content: <><p>These Terms are governed by the laws of the Republic of South Africa. Courts or statutory dispute-resolution bodies with lawful jurisdiction remain available where applicable.</p><p>LoadLink may update these Terms when the platform, law or risk environment changes. Material changes will be communicated through an appropriate platform or electronic notice, and the effective date at the top of this page will be updated.</p></>,
        },
        {
          id: "contact",
          title: "Questions and notices",
          content: <p>Questions about these Terms can be sent through the LoadLink Contact page or Help Centre. Formal business and information-officer particulars will be displayed with LoadLink's final public business particulars before public release.</p>,
        },
      ]}
    />
  );
}

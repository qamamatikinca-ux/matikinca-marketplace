import LegalPage, { LegalList, LegalNote } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Privacy Policy",
  description: "How LoadLink collects, uses, protects and shares personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This Privacy Policy explains how LoadLink processes personal information when you create an account, verify your identity or business, publish marketplace content, message other users, use dealership or driver tools, make payments or contact support."
      notice={<>LoadLink is designed for South African users and this policy is structured around the Protection of Personal Information Act, 2013 (POPIA). It should be read together with the Terms, Cookie Policy and Marketplace Rules.</>}
      sections={[
        {
          id: "responsible-party",
          title: "Who is responsible for your information",
          content: <><p>For the LoadLink platform, LoadLink determines why and how the personal information described in this policy is processed and acts as the responsible party where POPIA applies.</p><p>Privacy questions, objections, correction requests and deletion requests can be submitted through the Contact page. Final registered-business and Information Officer particulars will be added before public release once the operating entity details are finalised.</p></>,
        },
        {
          id: "information",
          title: "Information we process",
          content: <LegalList><li><strong>Account information:</strong> name, email address, phone number, authentication identifiers, profile photo and account settings.</li><li><strong>Verification information:</strong> identity or passport information, selfies, business or dealership documentation, driver licence and supporting documents, verification status and review records.</li><li><strong>Marketplace information:</strong> listings, photos, videos, vehicle specifications, routes, rates, availability, dealership details, driver profiles and content you choose to publish.</li><li><strong>Communications:</strong> LoadLink messages, attachments, structured quotes, reports, support requests and associated delivery or read metadata.</li><li><strong>Transaction and plan information:</strong> plan status, payment references, billing events, promotions and entitlement records. Payment providers may process card or banking information directly under their own terms.</li><li><strong>Technical and activity information:</strong> device/browser information, IP-derived security data, session information, login activity, feature usage, search activity, listing views and reliability/error telemetry.</li><li><strong>Safety information:</strong> reports, blocks, moderation decisions, duplicate/fraud signals and information reasonably required to investigate suspected abuse.</li></LegalList>,
        },
        {
          id: "purposes",
          title: "Why we use personal information",
          content: <LegalList><li>Create, authenticate, secure and support accounts.</li><li>Publish and operate marketplace listings, driver profiles and dealership pages.</li><li>Enable messaging, quotes, leads, saved items, analytics and other requested features.</li><li>Verify identities, drivers and dealerships and communicate verification decisions.</li><li>Detect fraud, abuse, account compromise, duplicate activity and prohibited conduct.</li><li>Process plans, payments, billing, promotions and entitlements.</li><li>Moderate content, investigate reports and enforce platform rules.</li><li>Provide customer support, service notices and security communications.</li><li>Improve performance, reliability, search quality and marketplace usability.</li><li>Comply with legal obligations and respond to lawful requests.</li></LegalList>,
        },
        {
          id: "lawful-processing",
          title: "Basis for processing",
          content: <><p>Depending on the context, LoadLink processes information because it is necessary to provide a service or perform an agreement with you, because a law permits or requires the processing, because you have consented, or because LoadLink or another party has a legitimate interest that is compatible with your rights and the requirements of POPIA.</p><p>Where consent is required, you may withdraw it, although this will not affect processing that was lawful before withdrawal.</p></>,
        },
        {
          id: "public-information",
          title: "What becomes public",
          content: <><p>Marketplace use involves deliberate public disclosure. Depending on the feature, a public listing or profile can show information such as a display name or dealership name, city/province, vehicle or job details, listing media, professional experience, verification label and other information you choose or are required to publish.</p><LegalNote>Identity documents, private verification files, internal fraud scores, owner keys, payment identifiers and private account identifiers are not intended to be public marketplace fields.</LegalNote></>,
        },
        {
          id: "sharing",
          title: "Who we share information with",
          content: <LegalList><li><strong>Other users:</strong> information necessary for marketplace discovery and communication.</li><li><strong>Service providers:</strong> hosting, database, authentication, email, payments, file storage, security, analytics and support providers acting under appropriate arrangements.</li><li><strong>Verification and safety providers:</strong> where reasonably required for identity, document, fraud or trust checks.</li><li><strong>Authorities and professional advisers:</strong> when required by law, legal process, safety obligations or to establish, exercise or defend legal rights.</li><li><strong>Business transfers:</strong> if LoadLink is involved in a lawful reorganisation, financing, acquisition or transfer, subject to applicable privacy requirements.</li></LegalList>,
        },
        {
          id: "marketing",
          title: "Direct marketing and notifications",
          content: <><p>LoadLink may send service, security, moderation, transaction and account notices that are necessary to operate the platform.</p><p>Promotional electronic communications will be handled in accordance with applicable consent and opt-out requirements. You can use the unsubscribe or preference controls provided with marketing communications. Opting out of marketing does not stop necessary account or security messages.</p></>,
        },
        {
          id: "automated-signals",
          title: "Fraud signals and automated processing",
          content: <><p>LoadLink may use automated signals to identify suspicious activity, duplicates, unusual account behaviour, potential fraud or listing-quality concerns. These signals can prioritise review or restrict obviously abusive automated activity.</p><p>Where a decision has a significant effect on an account, LoadLink aims to use appropriate safeguards and human review where reasonably required by law or the nature of the decision.</p></>,
        },
        {
          id: "retention",
          title: "How long we keep information",
          content: <><p>LoadLink keeps personal information only for as long as reasonably necessary for the purpose for which it was collected, for legitimate safety and dispute purposes, or for a period required by law.</p><p>Retention periods differ by data type. For example, active account and listing information may be retained while the service is used; security, payment, moderation and audit records may be kept longer where needed to prevent abuse, resolve disputes or meet legal and accounting obligations. Information that is no longer required will be deleted, de-identified or securely restricted where appropriate.</p></>,
        },
        {
          id: "security",
          title: "Security safeguards",
          content: <><p>LoadLink uses technical and organisational measures intended to protect personal information, including authentication controls, row-level database controls, least-privilege access, moderation and staff permissions, rate limiting, logging and secured infrastructure.</p><p>No internet service can guarantee absolute security. If LoadLink becomes aware of a qualifying security compromise, it will assess and handle notification obligations under applicable law.</p></>,
        },
        {
          id: "cross-border",
          title: "Cross-border processing",
          content: <p>Some infrastructure or service providers may process information outside South Africa. Where POPIA applies to a cross-border transfer, LoadLink will use an applicable legal mechanism or other safeguard required by section 72 of POPIA, taking the nature of the provider and processing into account.</p>,
        },
        {
          id: "rights",
          title: "Your POPIA rights",
          content: <><p>Subject to applicable law and exceptions, you may ask whether LoadLink holds personal information about you, request access, request correction or deletion, object to certain processing, withdraw consent where processing depends on consent, and object to unsolicited electronic direct marketing.</p><p>LoadLink may need to verify your identity before completing a privacy request and may retain information where the law or a legitimate legal need requires it.</p></>,
        },
        {
          id: "cookies",
          title: "Cookies and local device storage",
          content: <p>LoadLink uses cookies and similar storage for authentication, security, preferences, marketplace convenience and performance. The Cookie Policy explains the categories and choices in more detail.</p>,
        },
        {
          id: "complaints",
          title: "Questions, objections and complaints",
          content: <><p>Start by contacting LoadLink through the Contact page so the privacy team can investigate the concern. You may also have the right to lodge a complaint with South Africa's Information Regulator.</p><p>LoadLink will not require you to waive a statutory privacy right as a condition of submitting a complaint.</p></>,
        },
        {
          id: "changes",
          title: "Changes to this policy",
          content: <p>LoadLink may update this policy as the platform, service providers or legal requirements change. Material updates will be communicated through an appropriate platform or electronic notice and the effective date will be updated.</p>,
        },
      ]}
    />
  );
}

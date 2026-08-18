import Link from "next/link";
import type { ReactNode } from "react";

type PolicySectionProps = {
  id?: string;
  number?: string;
  title: string;
  children: ReactNode;
};

function PolicySection({ id, number, title, children }: PolicySectionProps) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-black/10 py-8 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-black tracking-[-0.025em] sm:text-3xl">
        {number ? `${number}. ` : ""}
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-black/72 sm:text-base">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item) => (
        <li key={item} className="list-disc pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

const policyLinks = [
  ["Terms of Use", "#terms-of-use"],
  ["Privacy Policy", "#privacy-policy"],
  ["Marketplace & Safety Policy", "#marketplace-safety-policy"],
  ["Refund & Cancellation Policy", "#refund-cancellation-policy"],
  ["Cookie Policy", "#cookie-policy"],
  ["Community Standards", "#community-standards"],
] as const;

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-[#fff6dc] text-black">
      <header className="border-b border-black/10 bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" aria-label="LoadLink home" className="outline-none">
            <img src="/images/loadlink-logo-light.png" alt="LoadLink" className="h-10 w-auto object-contain sm:h-12" />
          </Link>
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-[#fff6dc] px-4 py-2 text-sm font-black transition hover:bg-[#f6b800]"
          >
            Back to LoadLink
          </Link>
        </div>
      </header>

      <section className="px-4 py-9 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <h1 className="text-[36px] font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
              Legal & Marketplace Policy Pack
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] font-semibold leading-7 text-black/60 sm:text-lg">
              Platform Terms, Safety & Marketplace Policy for the Republic of South Africa.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-black/60">
              <span className="rounded-full border border-black/10 bg-white px-3 py-2">Version 1.0</span>
              <span className="rounded-full border border-black/10 bg-white px-3 py-2">Updated 18 August 2026</span>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {policyLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-[82px] items-center justify-between gap-3 rounded-[20px] border border-black/10 bg-white px-4 py-4 text-[13px] font-black leading-5 shadow-[0_8px_24px_rgba(0,0,0,.045)] transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_12px_28px_rgba(0,0,0,.07)] sm:min-h-[76px] sm:px-5 sm:text-sm"
              >
                {label}
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-sm text-[#f6b800] transition group-hover:translate-y-0.5">↓</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-6xl rounded-[26px] border border-black/10 bg-white p-5 shadow-[0_16px_42px_rgba(0,0,0,.055)] sm:rounded-[30px] sm:p-10">
          <div id="terms-of-use" className="scroll-mt-8 pb-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6500]">Terms of Use</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              LoadLink Platform Terms, Safety & Marketplace Policy
            </h2>
            <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-black/55">
              <p>Effective date: To be confirmed before public launch.</p>
              <p>Last updated: 18 August 2026.</p>
            </div>
            <p className="mt-5 max-w-4xl text-[15px] leading-7 text-black/72 sm:text-base">
              These terms apply to users accessing or using LoadLink, including its website, applications, messaging services, listings, job marketplace, vehicle marketplace, dealership services, mobile-unit marketplace and related functionality. By creating an account, accessing LoadLink or using its services, you agree to these terms and any additional policies referenced by them.
            </p>
          </div>

          <PolicySection number="1" title="What LoadLink Is">
            <p>
              LoadLink is a digital marketplace and technology platform that helps users discover, advertise and communicate about logistics-related opportunities, vehicles, equipment, services, drivers, dealerships, mobile units, jobs and contracts.
            </p>
            <p>Unless specifically stated otherwise by LoadLink in writing:</p>
            <BulletList
              items={[
                "LoadLink does not own vehicles, trailers, mobile units, machinery, equipment or other property listed by users.",
                "LoadLink is not the employer of users advertising or applying for opportunities through the platform.",
                "LoadLink is not automatically a buyer, seller, dealer, transporter, broker, insurer or contracting party in agreements concluded between users.",
                "LoadLink does not take ownership of property merely because that property appears on the platform.",
                "Communications, negotiations and agreements between users remain the responsibility of the users involved.",
              ]}
            />
            <p>A listing appearing on LoadLink does not mean that LoadLink owns, guarantees or endorses the listed property or opportunity.</p>
          </PolicySection>

          <PolicySection number="2" title="User Responsibility">
            <p>Users are responsible for conducting appropriate checks before entering into a transaction. This may include verifying:</p>
            <BulletList
              items={[
                "the identity of the other party;",
                "ownership of a vehicle, equipment or other property;",
                "vehicle registration and licensing information;",
                "company registration information;",
                "permits and operating licences;",
                "insurance;",
                "driver qualifications;",
                "vehicle condition;",
                "service history;",
                "banking information;",
                "contract terms;",
                "collection and delivery arrangements; and",
                "any other information relevant to the transaction.",
              ]}
            />
            <p>Users must exercise reasonable judgement when dealing with another person or business through LoadLink.</p>
          </PolicySection>

          <div id="marketplace-safety-policy" className="scroll-mt-8 border-t border-black/10 pt-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6500]">Marketplace & Safety Policy</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-black/60">
              The following sections set the platform baseline for verification, property risk, fraud, prohibited conduct, enforcement, investigations and safety reporting.
            </p>
          </div>

          <PolicySection number="3" title="Verification Does Not Equal a Guarantee">
            <p>LoadLink may provide verification processes, verification indicators, approved statuses, account checks or other trust and safety features. These measures are intended to reduce risk and improve platform integrity.</p>
            <p>However, unless expressly stated otherwise, a verification or approval indicator does not constitute:</p>
            <BulletList
              items={[
                "a guarantee of a user's future conduct;",
                "a guarantee that a transaction will be successful;",
                "a guarantee of vehicle or equipment condition;",
                "confirmation of ownership beyond the checks actually performed;",
                "an insurance policy;",
                "a financial guarantee;",
                "an endorsement of every representation made by the user; or",
                "a guarantee against fraud, theft, loss or misconduct.",
              ]}
            />
            <p>Verification information may also become outdated after verification has been completed.</p>
          </PolicySection>

          <PolicySection number="4" title="Vehicle, Equipment and Property Risk">
            <p>Users remain responsible for protecting their vehicles, equipment and property before, during and after a transaction.</p>
            <p>To the maximum extent permitted by applicable law, LoadLink is not responsible solely because users met through the platform for:</p>
            <BulletList
              items={[
                "vehicle theft;",
                "equipment theft;",
                "lost property;",
                "damaged vehicles;",
                "damaged cargo;",
                "damaged equipment;",
                "non-payment between users;",
                "fraudulent payment made by another user;",
                "vehicle accidents;",
                "cargo loss;",
                "contract breaches;",
                "mechanical failure;",
                "property deterioration;",
                "loss of income; or",
                "disputes concerning ownership or possession.",
              ]}
            />
            <p>Nothing in this policy excludes liability that may not lawfully be excluded or limited.</p>
          </PolicySection>

          <PolicySection number="5" title="Transactions Outside LoadLink">
            <p>LoadLink encourages users to keep relevant communication and transaction records within LoadLink where platform functionality allows.</p>
            <p>Where users move communications, negotiations or transactions to WhatsApp, telephone calls, email, cash transactions, external payment services or another platform, LoadLink may have substantially less information available to investigate a dispute.</p>
            <p>LoadLink is not responsible for supervising private transactions conducted outside its systems. Where an incident originated through LoadLink, LoadLink may nevertheless provide reasonable assistance where appropriate, including reviewing available platform records and assisting a legitimate investigation.</p>
          </PolicySection>

          <PolicySection number="6" title="Fraud, Theft and Stolen Property">
            <p>LoadLink has zero tolerance for the deliberate use of the platform to advertise, sell, hire, transfer or otherwise deal in property that a user knows, or reasonably ought to know, is stolen or unlawfully possessed.</p>
            <p>Users may not:</p>
            <BulletList
              items={[
                "advertise stolen vehicles;",
                "advertise stolen trailers or equipment;",
                "advertise property without authority from its lawful owner;",
                "use false ownership documents;",
                "alter or falsify vehicle information;",
                "knowingly misrepresent identifying information;",
                "use another person's identity without authority;",
                "conceal information for the purpose of facilitating fraud; or",
                "use LoadLink to coordinate criminal activity.",
              ]}
            />
            <p>Where LoadLink reasonably suspects fraud, stolen property or other serious unlawful conduct, LoadLink may immediately restrict relevant content or accounts, preserve records where legally permissible, request further verification, cooperate with lawful investigations, and report suspected criminal conduct to SAPS or another competent authority where appropriate or legally required. LoadLink does not make a final determination of criminal guilt.</p>
          </PolicySection>

          <div id="community-standards" className="scroll-mt-8 border-t border-black/10 pt-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6500]">Community Standards</p>
          </div>

          <PolicySection number="7" title="Prohibited Content and Platform Misuse">
            <p>Users may not use LoadLink to publish, distribute or facilitate:</p>
            <BulletList
              items={[
                "fraudulent listings;",
                "deliberately misleading listings;",
                "irrelevant spam;",
                "scams;",
                "impersonation;",
                "stolen property;",
                "fake job opportunities;",
                "unlawful services;",
                "malware or malicious links;",
                "threats;",
                "harassment;",
                "hate-based abuse;",
                "sexually exploitative content;",
                "graphic or seriously harmful content;",
                "deliberate misinformation intended to defraud another user;",
                "repeated duplicate listings intended to manipulate visibility;",
                "attempts to interfere with LoadLink's systems or security;",
                "attempts to bypass account restrictions;",
                "fake reviews, engagement or accounts; or",
                "content that otherwise violates applicable law or LoadLink policies.",
              ]}
            />
          </PolicySection>

          <PolicySection number="8" title="Enforcement">
            <p>LoadLink may take enforcement action based on the nature, severity, frequency and risk of the conduct involved. Possible action includes:</p>
            <BulletList
              items={[
                "Warning. Used for lower-risk or first-time violations where appropriate.",
                "Content restriction or removal. A listing, message, image or other material may be removed or restricted.",
                "Account flagging. An account may be marked for enhanced review or additional verification.",
                "Temporary suspension. Access to some or all LoadLink services may be temporarily restricted.",
                "Permanent suspension. Serious or repeated violations may result in permanent removal from LoadLink.",
                "Referral to authorities. Suspected criminal conduct may be referred to the relevant authorities where appropriate or required by law.",
              ]}
            />
            <p>LoadLink may act immediately where it reasonably believes there is a significant risk to users, property, the platform or the public.</p>
          </PolicySection>

          <PolicySection number="9" title="Circumventing Enforcement">
            <p>A user whose account has been suspended or permanently restricted may not create another account for the purpose of avoiding that restriction.</p>
            <p>LoadLink may restrict associated accounts where there is reasonable evidence that they are being used to circumvent enforcement.</p>
          </PolicySection>

          <PolicySection number="10" title="Accuracy of Listings">
            <p>Users are responsible for ensuring that information they publish is accurate, lawful and not misleading.</p>
            <p>A user listing a vehicle, equipment or service must have the legal right or appropriate authority to advertise it.</p>
            <p>Information including pricing, availability, condition, specifications, mileage, location, ownership and photographs must not intentionally mislead prospective users.</p>
            <p>Users must update or remove listings that are no longer available.</p>
          </PolicySection>

          <PolicySection number="11" title="Jobs and Contracts">
            <p>LoadLink provides technology through which users can advertise and discover jobs, contracts and commercial opportunities.</p>
            <p>Unless LoadLink expressly states otherwise, LoadLink does not:</p>
            <BulletList
              items={[
                "guarantee that a job will be awarded;",
                "guarantee payment under a contract;",
                "guarantee the profitability of an opportunity;",
                "guarantee the suitability of a contractor;",
                "determine the contractual relationship between users; or",
                "assume obligations agreed privately between users.",
              ]}
            />
            <p>Users are responsible for reviewing and understanding agreements before accepting work.</p>
          </PolicySection>

          <div id="refund-cancellation-policy" className="scroll-mt-8 border-t border-black/10 pt-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6500]">Refund & Cancellation Policy</p>
          </div>

          <PolicySection number="12" title="Payments Made to LoadLink">
            <p>Payments made directly to LoadLink may include subscriptions, listing services, promotional services or other LoadLink products.</p>
            <p>Payments made directly from one user to another are separate transactions and are not automatically payments to LoadLink.</p>
            <p>Users should carefully review the amount, service and payment information before confirming payment.</p>
          </PolicySection>

          <PolicySection number="13" title="Accidental Payments and Refund Requests">
            <p>Where a user believes that a payment was unintentionally made directly to LoadLink, the user should submit a refund request within 5 days of the payment.</p>
            <p>LoadLink may investigate the request before approving a refund. The review may consider:</p>
            <BulletList
              items={[
                "when the payment was made;",
                "what service was purchased;",
                "whether the service has already been substantially used;",
                "whether credits or promotional benefits have been consumed;",
                "whether a previous refund has already been issued;",
                "evidence of duplicate payment;",
                "suspected abuse or fraudulent activity; and",
                "any applicable consumer-protection requirements.",
              ]}
            />
            <p>Eligible refunds will be returned, where reasonably possible, to the original payment method. The 5-day accidental-payment review process does not remove, reduce or replace any cancellation, cooling-off, refund or other consumer right that applies under South African law. Where applicable law provides the user with a greater right or longer period, the applicable law will prevail.</p>
          </PolicySection>

          <PolicySection number="14" title="Subscription Cancellation">
            <p>Where LoadLink offers recurring paid subscriptions, users must be given a clear method to manage or cancel their subscription.</p>
            <p>Cancellation stops future renewal subject to the applicable plan terms.</p>
            <p>Cancellation of a subscription does not automatically create a right to reimbursement for previously consumed services unless required by law or provided under LoadLink's refund policy.</p>
          </PolicySection>

          <PolicySection number="15" title="Chargebacks and Payment Abuse">
            <p>Users should contact LoadLink where possible before initiating a chargeback relating to a payment dispute so that the matter can be investigated.</p>
            <p>LoadLink may investigate suspected:</p>
            <BulletList
              items={[
                "fraudulent chargebacks;",
                "payment manipulation;",
                "repeated refund abuse;",
                "stolen payment methods; or",
                "attempts to obtain services without payment.",
              ]}
            />
            <p>Legitimate consumer rights to dispute unauthorised or improper transactions are not restricted by this provision.</p>
          </PolicySection>

          <PolicySection number="16" title="Investigations and User Assistance">
            <p>LoadLink may investigate reports concerning:</p>
            <BulletList
              items={[
                "fraud;",
                "theft;",
                "harassment;",
                "impersonation;",
                "stolen property;",
                "suspicious listings;",
                "account compromise;",
                "payment disputes;",
                "dangerous behaviour; or",
                "serious policy violations.",
              ]}
            />
            <p>Where appropriate and legally permissible, LoadLink may review relevant platform records including account activity, listings, messages, reports, security information and verification records. LoadLink's ability to investigate depends on the information available to it. Users may be asked to provide supporting information.</p>
          </PolicySection>

          <PolicySection number="17" title="Cooperation With Authorities">
            <p>LoadLink may respond to valid legal requests from courts, SAPS, regulators or other competent authorities.</p>
            <p>Where legally permitted and appropriate, LoadLink may preserve or disclose relevant records for fraud investigations, theft investigations, user safety, enforcement of applicable law, legal proceedings or protection of LoadLink's legitimate rights.</p>
            <p>Any processing or disclosure of personal information must remain subject to applicable privacy and data-protection law.</p>
          </PolicySection>

          <PolicySection number="18" title="User Reports">
            <p>Users should report suspicious behaviour as soon as reasonably possible. Reports should include relevant information such as:</p>
            <BulletList
              items={[
                "listing details;",
                "usernames;",
                "conversation records;",
                "transaction information;",
                "photographs;",
                "payment evidence; and",
                "supporting documents.",
              ]}
            />
            <p>Knowingly submitting false or malicious reports against another user may itself constitute a violation of LoadLink policy.</p>
          </PolicySection>

          <PolicySection number="19" title="Account Security">
            <p>Users are responsible for taking reasonable steps to secure their accounts. Users should not:</p>
            <BulletList
              items={[
                "share passwords or authentication codes;",
                "intentionally allow unauthorised persons to access their account;",
                "attempt to access another user's account;",
                "sell verified accounts;",
                "manipulate verification; or",
                "provide false identity information.",
              ]}
            />
            <p>Suspected account compromise should be reported to LoadLink promptly.</p>
          </PolicySection>

          <div id="privacy-policy" className="scroll-mt-8 border-t border-black/10 pt-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6500]">Privacy Policy</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-black/60">
              The current policy pack establishes the privacy baseline below. It also identifies a standalone Privacy Policy covering POPIA, verification information, documents, messages, account and security data, retention, deletion requests and data-subject rights as part of the recommended launch policy set.
            </p>
          </div>

          <PolicySection number="20" title="Privacy and Personal Information">
            <p>LoadLink processes personal information to operate, secure and improve the platform and provide requested services.</p>
            <p>Depending on the services used, this may include information relating to accounts, contact information, identity or verification, listings, vehicles or businesses, messages, payments and transaction records, security activity, devices, customer support, and reports or investigations.</p>
            <p>LoadLink will process personal information in accordance with its Privacy Policy and applicable South African data-protection requirements.</p>
            <p>Users must not collect, publish or misuse another person's personal information through LoadLink in an unlawful manner.</p>
          </PolicySection>

          <PolicySection number="21" title="User Content">
            <p>Users retain their rights in content they create, subject to the permissions reasonably required for LoadLink to host, display, process, moderate and distribute that content as part of operating the platform.</p>
            <p>Uploading content does not transfer ownership of the underlying vehicle, equipment, business or other property to LoadLink.</p>
            <p>Users must have the necessary rights to photographs, text, documents and other content they upload.</p>
          </PolicySection>

          <PolicySection number="22" title="Availability of the Platform">
            <p>LoadLink aims to provide a secure and reliable service but cannot guarantee that the platform will operate continuously without interruption.</p>
            <p>Maintenance, technical failures, telecommunications problems, cybersecurity incidents or circumstances outside LoadLink's reasonable control may temporarily affect availability.</p>
            <p>LoadLink may modify, repair, restrict or discontinue functionality where reasonably necessary.</p>
          </PolicySection>

          <PolicySection number="23" title="Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, LoadLink is not liable merely because two users discovered or contacted one another through LoadLink for losses resulting from a private transaction between those users.</p>
            <p>This may include losses arising from fraud by another user, theft, property damage, non-payment, contract disputes or inaccurate information supplied by another user.</p>
            <p>This limitation does not exclude or restrict any liability that LoadLink is legally prohibited from excluding or restricting, including liability arising from LoadLink's gross negligence where applicable.</p>
          </PolicySection>

          <PolicySection number="24" title="No Insurance">
            <p>LoadLink is not an insurer.</p>
            <p>Unless expressly stated in writing, using LoadLink does not provide insurance for vehicles, goods, cargo, trailers, machinery, mobile units, equipment, commercial transactions or users.</p>
            <p>Users are responsible for obtaining appropriate insurance where necessary.</p>
          </PolicySection>

          <PolicySection number="25" title="Policy Updates">
            <p>LoadLink may update these policies as the platform develops or where changes are necessary for security, functionality, regulation or legal compliance.</p>
            <p>Material changes should be communicated to users where appropriate.</p>
            <p>The current version of the policies will be made available through LoadLink.</p>
          </PolicySection>

          <PolicySection number="26" title="Governing Law">
            <p>These terms are governed by the laws of the Republic of South Africa, subject to any mandatory rights or jurisdiction that applicable law provides to a user.</p>
          </PolicySection>

          <PolicySection number="27" title="Contact and Disputes">
            <p>Users should contact LoadLink regarding suspicious activity, account issues, payment or refund requests, disputed enforcement decisions, privacy requests, security concerns or legal enquiries.</p>
            <p>
              Support: <a className="font-black underline underline-offset-4" href="mailto:loadlinksouthafrica@gmail.com">loadlinksouthafrica@gmail.com</a>
            </p>
            <p>Legal and Privacy: a dedicated address is to be created before public launch.</p>
            <p>Nothing in this section prevents a user from exercising any right available under applicable South African law.</p>
          </PolicySection>

          <section id="cookie-policy" className="scroll-mt-8 border-t border-black/10 py-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6500]">Cookie Policy</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] sm:text-3xl">Cookie policy scope in Version 1.0</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-7 text-black/72 sm:text-base">
              <p>The current policy pack identifies a standalone Cookie Policy as part of the recommended launch policy set, covering necessary, authentication, analytics and future advertising cookies.</p>
              <p>The detailed standalone Cookie Policy is not fully drafted in Version 1.0 of the pack and remains subject to completion and legal review before public launch.</p>
            </div>
          </section>

          <section className="border-t border-black/10 pt-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6500]">Transaction Safety Notice</p>
            <div className="mt-3 rounded-[22px] border border-[#d7c17c] bg-[#fffaf0] p-5">
              <h2 className="text-xl font-black">Before you proceed</h2>
              <p className="mt-2 text-sm leading-6 text-black/68 sm:text-base">
                Confirm ownership, identity, documents and payment arrangements before handing over a vehicle, equipment or money. LoadLink connects users but is not automatically a party to agreements between them.
              </p>
            </div>
          </section>
        </div>
      </section>

      <footer className="border-t border-black/10 bg-black px-5 py-10 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xl font-black">LoadLink</p>
            <p className="mt-1 text-sm text-white/55">Logistics made easier.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-white/70">
            {policyLinks.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

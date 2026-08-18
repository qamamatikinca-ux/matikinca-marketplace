import LegalPage, { LegalList, LegalNote } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Cookie Policy",
  description: "How LoadLink uses cookies, local storage and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      summary="This policy explains how LoadLink uses cookies, local storage and similar browser technologies to keep accounts secure, remember preferences, support marketplace features and understand platform performance."
      sections={[
        {
          id: "what",
          title: "What these technologies are",
          content: <><p>Cookies are small pieces of data stored by a browser and sent with relevant requests. Local storage and similar technologies can keep information on a device without sending it with every request.</p><p>LoadLink uses these technologies only for defined platform purposes and does not treat every browser-storage item as advertising technology.</p></>,
        },
        {
          id: "necessary",
          title: "Strictly necessary storage",
          content: <><p>Some storage is necessary to operate LoadLink securely or provide a feature you request. This can include authentication/session state, security controls, fraud prevention, theme/accessibility choices, form recovery and other core platform state.</p><LegalNote>Blocking strictly necessary browser storage can prevent login, secure messaging, posting or other requested features from working correctly.</LegalNote></>,
        },
        {
          id: "preferences",
          title: "Preferences and convenience",
          content: <LegalList><li>Light/dark appearance and simple-mode preferences.</li><li>Recently viewed or saved marketplace convenience state where applicable.</li><li>Draft or form-recovery state intended to prevent users losing work.</li><li>Dismissed notices and non-sensitive interface preferences.</li></LegalList>,
        },
        {
          id: "performance",
          title: "Performance and analytics",
          content: <><p>LoadLink may use measurement technologies to understand page performance, feature reliability, search usage, errors and aggregated marketplace activity. These measurements help identify slow pages, broken flows and features that need improvement.</p><p>Where a non-essential analytics technology requires consent under applicable law, LoadLink will use the relevant consent control before enabling it.</p></>,
        },
        {
          id: "third-parties",
          title: "Third-party technologies",
          content: <p>LoadLink relies on infrastructure and service providers for functions such as hosting, authentication, payments, email and security. A provider may set or receive a cookie or similar identifier when necessary to supply its service. Its processing is also governed by the applicable provider arrangements and privacy terms.</p>,
        },
        {
          id: "choices",
          title: "Your choices",
          content: <><p>You can remove or block browser cookies and local storage through your browser or device settings. You may also use any LoadLink consent or preference controls made available for optional technologies.</p><p>Deleting browser storage can sign you out, reset preferences or remove local draft/convenience state. Server-side account information is not deleted merely by clearing browser storage.</p></>,
        },
        {
          id: "retention",
          title: "Retention",
          content: <p>Browser-storage duration depends on its purpose. Session data may expire when a session ends; preference state may remain until changed or cleared; security identifiers may be rotated or expire according to their security purpose. LoadLink avoids retaining non-essential identifiers for longer than reasonably necessary.</p>,
        },
        {
          id: "changes",
          title: "Changes to this policy",
          content: <p>LoadLink may update this policy if browser technologies, providers or legal requirements change. The effective date will be updated when material changes are made.</p>,
        },
      ]}
    />
  );
}

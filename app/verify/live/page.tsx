import LiveIdentityCheck from '@/components/LiveIdentityCheck';
export const metadata = { title: 'Guided camera check | LoadLink', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ purpose?: string }> }) {
 const params = await searchParams;
 const purpose = ['driver', 'vehicle', 'account'].includes(params.purpose || '') ? params.purpose : 'account';
 return <LiveIdentityCheck initialPurpose={purpose} />;
}

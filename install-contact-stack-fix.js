const fs = require('fs');
const path = require('path');
const root = process.cwd();
const p = (...x) => path.join(root, ...x);
const read = f => fs.readFileSync(p(f), 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(p(f)), {recursive:true}); fs.writeFileSync(p(f), s); };

const SQL = `-- LoadLink contact stack + owner controls update.
-- Run this once in Supabase SQL Editor.

alter table public.job_listings add column if not exists owner_key text not null default '';
alter table public.job_listings add column if not exists view_count integer not null default 0;
alter table public.job_listings add column if not exists last_viewed_at timestamptz;
alter table public.job_listings add column if not exists whatsapp_number text not null default '';
alter table public.job_listings add column if not exists poster_photo text not null default '';

create or replace function public.delete_job_listing(p_job_id uuid, p_owner_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected_count integer;
begin
  delete from public.job_listings
  where id = p_job_id and owner_key = p_owner_key and length(owner_key) > 20;
  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

create or replace function public.update_job_listing(
  p_job_id uuid, p_owner_key text, p_title text, p_city text,
  p_vehicle_group text, p_rate text, p_contact_number text, p_description text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected_count integer;
begin
  update public.job_listings set
    title = p_title, city = p_city, vehicle_group = p_vehicle_group,
    rate = p_rate, contact_number = p_contact_number, description = p_description
  where id = p_job_id and owner_key = p_owner_key and length(owner_key) > 20;
  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

create or replace function public.increment_job_view(p_job_id uuid, p_viewer_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected_count integer;
begin
  update public.job_listings set view_count = coalesce(view_count, 0) + 1, last_viewed_at = now()
  where id = p_job_id and (owner_key is null or owner_key = '' or owner_key <> p_viewer_key);
  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

grant execute on function public.delete_job_listing(uuid, text) to anon, authenticated;
grant execute on function public.update_job_listing(uuid, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.increment_job_view(uuid, text) to anon, authenticated;
`;

function patchJobsPage() {
  const file = 'app/jobs/page.tsx';
  if (!fs.existsSync(p(file))) return console.log('Missing app/jobs/page.tsx');
  let code = read(file);

  // add database fields to types
  if (!code.includes('whatsappNumber?: string;')) {
    code = code.replace('contactNumber: string;', 'contactNumber: string;\n  whatsappNumber?: string;\n  posterPhoto?: string;');
  }
  if (!code.includes('whatsapp_number?: string')) {
    code = code.replace('contact_number: string | null;', 'contact_number: string | null;\n  whatsapp_number?: string | null;\n  poster_photo?: string | null;');
  }

  // fetch the new columns
  code = code.replace(/contact_number,description,photos/g, 'contact_number,whatsapp_number,poster_photo,description,photos');

  // map new columns into UI object
  if (!code.includes('whatsappNumber: row.whatsapp_number')) {
    code = code.replace(
      'contactNumber: row.contact_number || "No number added",',
      'contactNumber: row.contact_number || "No number added",\n    whatsappNumber: row.whatsapp_number || row.contact_number || "",\n    posterPhoto: row.poster_photo || "",'
    );
  }

  // exact recently viewed target
  code = code.replace('href: "/jobs",', 'href: `/jobs#job-${job.id}`,' );

  // ensure exact job anchor on cards
  if (!code.includes('id={`job-${job.id}`}')) {
    code = code.replace(/<article className={`overflow-hidden border/g, '<article id={`job-${job.id}`} className={`scroll-mt-24 overflow-hidden border');
  }

  // helper for WhatsApp if missing
  if (!code.includes('function normaliseWhatsapp')) {
    code = code.replace(
      /function buildGreeting\(job: JobListing/,
      'function normaliseWhatsapp(value?: string) {\n  const clean = (value || "").replace(/[^\\d+]/g, "");\n  if (!clean) return "";\n  if (clean.startsWith("0")) return `27${clean.slice(1)}`;\n  return clean.replace("+", "");\n}\n\nfunction buildGreeting(job: JobListing'
    );
  }

  // remove old copy greeting function if present
  code = code.replace(/async function copyGreeting\(job: JobListing\) \{[\s\S]*?\n\}/, '');

  // replace messy 4-button area with stack
  code = code.replace(
    /<div className="mt-5 grid grid-cols-2 gap-3">[\s\S]*?Save job[\s\S]*?<\/div>/,
    '<ContactSellerStack job={job} darkMode={darkMode} />'
  );

  if (!code.includes('function ContactSellerStack')) {
    const stack = `
function ContactSellerStack({ job, darkMode }: { job: JobListing; darkMode: boolean }) {
  const whatsappPhone = normaliseWhatsapp(job.whatsappNumber || job.contactNumber);
  const message = buildGreeting(job);

  return (
    <div className={\`mt-5 overflow-hidden border \${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-[#f8f9ff]"}\`}>
      <div className="p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b88900]">Contact poster</p>
        <div className={\`mt-3 flex items-center gap-3 border p-3 \${darkMode ? "border-white/10 bg-[#090909]" : "border-black/10 bg-white"}\`}>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-[#f6b800]/50 bg-white">
            {job.posterPhoto ? <img src={job.posterPhoto} alt={job.postedBy} className="h-full w-full object-cover" /> : <PosterUserIcon />}
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-lg font-black">{job.postedBy}</h4>
            <p className={\`mt-1 text-xs font-bold \${darkMode ? "text-white/55" : "text-black/55"}\`}>{job.city} • {job.group}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 border-t border-black/10">
        <a href={\`tel:\${job.contactNumber.replace(/\\s/g, "")}\`} className="flex min-h-20 flex-col items-center justify-center gap-2 border-r border-black/10 bg-[#168eea] px-2 text-center text-xs font-black uppercase tracking-wide text-white"><PhoneIcon /> Call</a>
        <button onClick={() => greetPoster(job)} className="flex min-h-20 flex-col items-center justify-center gap-2 border-r border-black/10 bg-[#168eea] px-2 text-center text-xs font-black uppercase tracking-wide text-white"><MessageIcon /> Message</button>
        <a href={whatsappPhone ? \`https://wa.me/\${whatsappPhone}?text=\${encodeURIComponent(message)}\` : "#"} onClick={(e) => { if (!whatsappPhone) { e.preventDefault(); greetPoster(job); } }} target="_blank" rel="noreferrer" className="flex min-h-20 flex-col items-center justify-center gap-2 bg-[#0d442b] px-2 text-center text-xs font-black uppercase tracking-wide text-white"><WhatsAppIcon /> WhatsApp</a>
      </div>
    </div>
  );
}
function PosterUserIcon() { return <svg width="38" height="38" viewBox="0 0 24 24" fill="none" className="text-black"><path d="M12 12.2a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c.7-4.2 3.8-6.9 8-6.9s7.3 2.7 8 6.9" fill="currentColor" /></svg>; }
function PhoneIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6.6 3.4 9.4 6c.7.6.8 1.6.3 2.4l-1 1.5c1.2 2.4 3 4.2 5.4 5.4l1.5-1c.8-.5 1.8-.4 2.4.3l2.6 2.8c.7.8.7 2-.1 2.7-.9.8-2 1.2-3.2 1.2C9.2 21.3 2.7 14.8 2.7 6.7c0-1.2.4-2.3 1.2-3.2.7-.8 1.9-.9 2.7-.1Z" fill="currentColor" /></svg>; }
function MessageIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2.2-.1 6.3 5.1c.3.3.8.3 1.1 0l6.2-5.1H5.2Z" fill="currentColor" /></svg>; }
function WhatsAppIcon() { return <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.4.7 4.7 1.9 6.7L3.5 29l6.7-1.7c1.8 1 3.8 1.5 5.8 1.5 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm7.4 18.1c-.3.9-1.8 1.7-2.5 1.8-.7.1-1.5.1-2.4-.2-.6-.2-1.3-.4-2.2-.8-3.9-1.7-6.5-5.6-6.7-5.8-.2-.2-1.6-2.1-1.6-4s1-2.8 1.4-3.2c.3-.4.8-.5 1.1-.5h.8c.3 0 .6.1.8.7.3.7 1 2.4 1.1 2.6.1.2.1.5 0 .7-.1.3-.2.4-.4.7-.2.2-.4.5-.6.7-.2.2-.4.4-.2.8.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.5 2.5 1.7.3.2.6.2.8-.1.2-.3.9-1.1 1.1-1.4.2-.3.5-.3.8-.2.3.1 2.1 1 2.5 1.2.4.2.7.3.8.5.1.2.1 1.1-.2 2Z" fill="currentColor" /></svg>; }
`;
    code = code.replace(/function PhotoGalleryModal/, stack + '\nfunction PhotoGalleryModal');
  }

  write(file, code);
}

function patchRecentPanel() {
  const file = 'components/RecentActivityPanel.tsx';
  if (!fs.existsSync(p(file))) return;
  let code = read(file);
  code = code.replace('href: item.href,', 'href: item.href || `/jobs#job-${item.id}`,');
  code = code.replace('href: "/jobs",', 'href: `/jobs#job-${item.id}`,' );
  write(file, code);
}

function patchListPage() {
  const file = 'app/jobs/list/page.tsx';
  if (!fs.existsSync(p(file))) return console.log('Missing app/jobs/list/page.tsx');
  let code = read(file);

  // imports
  if (!code.includes('useEffect')) code = code.replace('useState } from "react"', 'useEffect, useState } from "react"');

  // states
  if (!code.includes('whatsappNumber')) {
    code = code.replace('const [contactNumber, setContactNumber] = useState("");', 'const [contactNumber, setContactNumber] = useState("");\n  const [whatsappNumber, setWhatsappNumber] = useState("");\n  const [posterPhoto, setPosterPhoto] = useState<File | null>(null);\n  const [posterPhotoPreview, setPosterPhotoPreview] = useState("");');
  }

  // dark theme state for listing page header
  if (!code.includes('const [darkMode, setDarkMode]')) {
    code = code.replace('const router = useRouter();', 'const router = useRouter();\n  const [darkMode, setDarkMode] = useState(false);\n\n  useEffect(() => {\n    const savedTheme = localStorage.getItem("loadlink-theme");\n    if (savedTheme === "dark") setDarkMode(true);\n  }, []);\n\n  function toggleDarkMode() {\n    const nextMode = !darkMode;\n    setDarkMode(nextMode);\n    localStorage.setItem("loadlink-theme", nextMode ? "dark" : "light");\n    window.dispatchEvent(new Event("loadlink-theme-change"));\n  }');
  }

  // poster photo handler and upload helper
  if (!code.includes('handlePosterPhoto')) {
    code = code.replace('async function handlePhotos', 'async function handlePosterPhoto(e: ChangeEvent<HTMLInputElement>) {\n    const file = e.target.files?.[0] || null;\n    setPosterPhoto(file);\n    if (!file) return setPosterPhotoPreview("");\n    const reader = new FileReader();\n    reader.onload = () => setPosterPhotoPreview(String(reader.result));\n    reader.readAsDataURL(file);\n  }\n\n  async function handlePhotos');
  }

  if (!code.includes('async function uploadOne')) {
    code = code.replace('async function uploadPhotos()', 'async function uploadOne(file: File, folder: string, maxWidth = 1000) {\n    const resizedBlob = await resizePhoto(file);\n    const safeFileName = file.name.replace(/[^a-z0-9.]/gi, "-").toLowerCase();\n    const filePath = `${folder}/${Date.now()}-${safeFileName}`;\n\n    const { error } = await supabase.storage.from("job-photos").upload(filePath, resizedBlob, {\n      cacheControl: "3600",\n      contentType: "image/jpeg",\n      upsert: false,\n    });\n\n    if (error) throw error;\n    const { data } = supabase.storage.from("job-photos").getPublicUrl(filePath);\n    return data.publicUrl;\n  }\n\n  async function uploadPhotos()');
  }

  // validate WhatsApp only if entered
  if (!code.includes('Enter a valid WhatsApp')) {
    code = code.replace('if (files.length < 1) {', 'if (whatsappNumber && !isValidSouthAfricanPhone(whatsappNumber)) {\n      setMessage("Enter a valid WhatsApp number or leave it empty.");\n      return;\n    }\n\n    if (files.length < 1) {');
  }

  // upload poster and insert columns
  if (!code.includes('posterPhotoUrl')) {
    code = code.replace('const uploadedUrls = await uploadPhotos();', 'const uploadedUrls = await uploadPhotos();\n      const posterPhotoUrl = posterPhoto ? await uploadOne(posterPhoto, "posters", 500) : "";');
  }
  if (!code.includes('whatsapp_number: whatsappNumber')) {
    code = code.replace('contact_number: contactNumber,', 'contact_number: contactNumber,\n        whatsapp_number: whatsappNumber,\n        poster_photo: posterPhotoUrl,');
  }

  // add inputs after contact number input
  if (!code.includes('WhatsApp number optional')) {
    code = code.replace(/<input\s+required\s+type="tel"[\s\S]*?contactNumber[\s\S]*?className="h-12[\s\S]*?"\s*\/>/, (m) => m + '\n\n          <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="WhatsApp number optional" className="h-12 border border-white/15 bg-white px-4 font-bold text-black outline-none" />');
  }
  if (!code.includes('Face / logo photo optional')) {
    code = code.replace(/<textarea required[\s\S]*?\/\>/, (m) => m + '\n\n          <label className="border border-white/15 bg-black p-4">\n            <span className="block text-xs font-black uppercase tracking-[0.2em] text-[#f6b800]">Face / logo photo optional</span>\n            <span className="mt-2 block text-sm font-bold text-white/60">Add a real face photo or business logo so buyers know who they’re contacting.</span>\n            <input type="file" accept="image/*" onChange={handlePosterPhoto} className="mt-3 block w-full text-sm" />\n          </label>\n\n          {posterPhotoPreview ? (\n            <div className="flex items-center gap-3">\n              <img src={posterPhotoPreview} alt="" className="h-20 w-20 object-cover" />\n              <p className="text-sm font-bold text-white/60">This will show in the contact poster box.</p>\n            </div>\n          ) : null}');
  }

  // replace simple Back header with homepage-style header if old header present
  if (!code.includes('function Header(')) {
    code = code.replace(/<header[\s\S]*?<\/header>/, '<Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />');
    code += `

function Header({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  return (
    <header className={\`sticky top-0 z-50 border-b transition-colors duration-500 \${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}\`}>
      <div className="grid h-20 w-full grid-cols-[92px_1fr_52px] items-center px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className={\`flex h-10 w-10 items-center justify-center text-3xl font-black \${darkMode ? "text-white" : "text-black"}\`} aria-label="Open menu">☰</Link>
          <Link href="/login" aria-label="Log in or sign up" className={\`flex h-10 w-10 items-center justify-center rounded-full border \${darkMode ? "border-yellow-400/60 bg-yellow-400 text-black" : "border-black/10 bg-white text-black shadow-[0_8px_18px_rgba(0,0,0,0.08)]"}\`}><HeaderUserPlusIcon /></Link>
        </div>
        <Link href="/" className="flex min-w-0 items-center justify-center overflow-visible" aria-label="Go to LoadLink homepage"><LoadLinkLogo /></Link>
        <button onClick={toggleDarkMode} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} className={\`ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 \${darkMode ? "border-yellow-400/70 bg-yellow-400 text-black" : "border-black/10 bg-black text-[#f6b800]"}\`}>{darkMode ? <HeaderSunIcon /> : <HeaderMoonIcon />}</button>
      </div>
    </header>
  );
}
function HeaderUserPlusIcon() { return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M10.4 11.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM3.2 20.4c.55-3.85 3.35-6.4 7.2-6.4 2.1 0 3.86.76 5.1 2.07" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 14.2v6.6M14.7 17.5h6.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>; }
function HeaderSunIcon() { return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84 5.28 5.28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function HeaderMoonIcon() { return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M20.2 14.1A8.7 8.7 0 0 1 9.9 3.8a8.7 8.7 0 1 0 10.3 10.3Z" fill="currentColor" /></svg>; }
`;
  }

  write(file, code);
}

patchJobsPage();
patchRecentPanel();
patchListPage();
write('supabase-contact-stack.sql', SQL);
write('loadlink-contact-stack-fix-installed.txt', `Installed at ${new Date().toISOString()}\n`);
console.log('LOADLINK CONTACT STACK FIX INSTALLED');
console.log('Fixed: removed Copy Greeting, added Call/Message/WhatsApp contact stack, optional face/logo photo, optional WhatsApp field, cleaner listing form, homepage-style listing header, recently viewed exact job links.');
console.log('NEXT: run supabase-contact-stack.sql in Supabase SQL Editor.');

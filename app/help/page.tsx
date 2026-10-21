"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import LinkBot from "@/components/LinkBot";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { helpArticles, helpCategories, searchHelp } from "@/lib/helpKnowledge";
export default function HelpPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("account");
  const results = useMemo(() => query.trim() ? searchHelp(query).map(item => item.article) : helpArticles.filter(item => item.category === category), [query, category]);
  return <main className="ll-help-page ll-workspace-page" data-theme={darkMode ? "dark" : "light"} data-loadlink-help-centre="20261021">
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
    <div className="ll-help-container">
      <header className="ll-help-hero"><p className="ll-eyebrow">LoadLink Help Centre</p><h1>How can we help?</h1><p>Clear answers. The right next step. Support when you need it.</p>
        <label className="ll-help-search"><LoadLinkIcon name="search" size={21}/><span className="sr-only">Search the Help Centre</span><input type="search" inputMode="text" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Try “driver permit” or “payment taken”"/>{query ? <button type="button" aria-label="Clear search" onClick={()=>setQuery("")}><LoadLinkIcon name="close" size={18}/></button>:null}</label>
      </header>
      <div className="ll-help-layout"><nav className="ll-help-topics" aria-label="Help topics">{helpCategories.map(item=><button key={item.id} aria-pressed={category===item.id&&!query} onClick={()=>{setCategory(item.id);setQuery("");}}><strong>{item.label}</strong><span>{item.description}</span><LoadLinkIcon name="chevronRight" size={17}/></button>)}</nav>
        <section className="ll-help-answers" aria-label="Help articles"><div className="ll-section-heading"><h2>{query ? "Search results" : helpCategories.find(item=>item.id===category)?.label}</h2><span role="status">{results.length} {results.length===1?"article":"articles"}</span></div>
          {results.length ? results.map(article=><details key={article.id}><summary>{article.title}<LoadLinkIcon name="plus" size={18}/></summary><div className="ll-help-answer"><p>{article.answer}</p><Link href={article.action.href}>{article.action.label}<LoadLinkIcon name="arrowUpRight" size={16}/></Link></div></details>):<div className="ll-help-empty"><h3>Let’s find the right answer</h3><p>Try a few key words, choose a topic, or describe the problem to LinkBot.</p><button className="ll-gold-button" onClick={()=>window.dispatchEvent(new Event("loadlink:open-linkbot"))}>Ask LinkBot</button></div>}
        </section>
      </div>
      <section id="contact-support" className="ll-help-contact"><div><h2>Need a hand?</h2><p>Ask LinkBot for guidance or send a case to the LoadLink team.</p></div><div><button className="ll-secondary-button" onClick={()=>window.dispatchEvent(new Event("loadlink:open-linkbot"))}>Ask LinkBot</button><button className="ll-gold-button" onClick={()=>window.dispatchEvent(new Event("loadlink:open-agent-support"))}>Talk to an agent</button><Link href="/support/cases">My support cases<LoadLinkIcon name="chevronRight" size={16}/></Link></div></section>
    </div><LinkBot/>
  </main>;
}

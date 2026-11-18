import type {ReactNode} from 'react';
import Link from './link';
import {AppCard} from './app-card';
import {CategoryTabs} from './category-tabs';
import {localizedFeaturedAppCollections,localizedFeaturedLearnArticles} from '../../lib/content-i18n';
import {getMessages,localizedPath,type Locale} from '../../lib/i18n';
import {jsonLdScript} from '../lib/seo';
const absoluteUrl=(path:string)=>'https://mcpapp.net'+path;
import type {CatalogApp,CategorySummary} from '../lib/types';
export default function HomeContent({locale,apps,categories,children}:{locale:Locale;apps:CatalogApp[];categories:CategorySummary[];children?:ReactNode}){
 const t=getMessages(locale);
  const href = (path: string) => localizedPath(path, locale);
  const learning = localizedFeaturedLearnArticles(locale);
  const collections = localizedFeaturedAppCollections(locale);

  return (
    <div className="page-stack">
      <header className="header">
        <div className="title-group">
          <h1>
            {t.home.headline} <span className="headline-chip">{t.common.beta}</span>
          </h1>
          <p className="subtitle">
            {t.home.subtitle}
          </p>
        </div>
        <form action={href("/search")} className="search">
          <label className="sr-only" htmlFor="home-search">{t.common.search}</label>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" fill="none" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input autoComplete="off" id="home-search" name="q" placeholder={t.home.searchPlaceholder} type="search" />
        </form>
      </header>
      <nav className="home-quick-links" aria-label={t.common.availableSurfaces}>
        <Link href={href("/chatgpt-apps")} prefetch={false}>{t.nav.chatgpt}</Link>
        <Link href={href("/claude-connectors")} prefetch={false}>{t.nav.claude}</Link>
        <Link href={href("/remote-mcp-servers")} prefetch={false}>Remote MCP</Link>
        <Link href={href("/store")} prefetch={false}>{t.common.all} {t.common.apps}</Link>
      </nav>
      <CategoryTabs activeSlug={undefined} categories={categories} locale={locale} messages={t} />
      <section className="grid" aria-label={t.common.appListAria}>
        <div className="home-directory-head">
          <div>
            <p className="eyebrow">{t.categoryTabs.featured}</p>
            <h2>{t.home.appListName}</h2>
          </div>
          <Link href={href("/store")} prefetch={false}>{t.common.all} {t.common.apps}</Link>
        </div>
        <div className="app-list">
          {apps.map((app) => (
            <AppCard app={app} key={app.id} locale={locale} messages={t} />
          ))}
        </div>
      </section>
      <section className="home-collection-strip" aria-label={t.home.collectionsAria}>
        <div className="home-collection-copy">
          <p className="eyebrow">{t.home.collectionsEyebrow}</p>
          <h2>{t.home.collectionsTitle}</h2>
          <p>{t.home.collectionsBody}</p>
        </div>
        <div className="home-collection-links">
          {collections.map((collection) => (
            <Link href={href(`/collections/${collection.slug}`)} key={collection.slug} prefetch={false}>
              <span>{collection.eyebrow}</span>
              <strong>{collection.title}</strong>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-learn-band" aria-label={t.home.learnAria}>
        <div>
          <p className="eyebrow">{t.home.learnEyebrow}</p>
          <h2>{t.home.learnTitle}</h2>
          <p>{t.home.learnBody}</p>
        </div>
        <div className="home-learn-links">
          {learning.slice(0, 3).map((article) => (
            <Link href={href(`/learn/${article.slug}`)} key={article.slug} prefetch={false}>
              <span>{article.title}</span>
              <span aria-hidden="true" className="home-learn-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>
      {children}
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          {'@context':'https://schema.org','@type':'Organization',name:'MCP App Store',alternateName:['mcpapp','mcpappstore','MCPAppStore'],url:absoluteUrl('/'),logo:absoluteUrl('/icon.svg')},
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MCP App Store",
            alternateName: ["mcpapp", "mcpappstore", "MCPAppStore"],
            url: absoluteUrl("/"),
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl(href("/search"))}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {'@context':'https://schema.org','@type':'ItemList',name:t.home.appListName,itemListElement:apps.map((app,index)=>({'@type':'ListItem',position:index+1,name:app.name,url:absoluteUrl(href(`/app/${app.id}`))}))},
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

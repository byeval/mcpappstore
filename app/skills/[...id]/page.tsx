import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppCard } from "@/components/app-card";
import { getSkillById, listAppsForSkill } from "@/lib/data";
import { getI18n } from "@/lib/i18n-server";
import { formatMessage, localizedPath, type Locale } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, jsonLdScript, pageMetadata, truncateMeta } from "@/lib/seo";
import { skillIdFromSegments, skillPath } from "@/lib/skill-routes";
import { staticPageCopy } from "@/lib/static-page-i18n";
import type { CatalogSkill, SkillAppRef } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}): Promise<Metadata> {
  const [{ locale }, { id }] = await Promise.all([getI18n(), params]);
  const copy = staticPageCopy(locale).skills;
  const skillId = skillIdFromSegments(id);
  const [skill, apps] = await Promise.all([getSkillById(skillId), listAppsForSkill(skillId)]);
  if (!skill) {
    return {};
  }
  const appPhrase = apps.length > 0
    ? formatMessage(copy.pairedAppsMeta, { apps: apps.slice(0, 3).map((app) => app.name).join(", ") })
    : "";

  return pageMetadata({
    title: formatMessage(copy.detailTitle, { name: skill.displayName }),
    description: truncateMeta(`${skill.description}${appPhrase}`),
    path: skillPath(skill.id),
    locale,
  });
}

function installCommand(skill: CatalogSkill): string | undefined {
  if (skill.installUrl) {
    return skill.installUrl;
  }

  if (skill.id.startsWith("skills-sh:")) {
    const parts = skill.id.slice("skills-sh:".length).split("/");
    const skillName = parts.pop();
    const source = parts.join("/");
    if (source && skillName) {
      return `npx skills add ${source}@${skillName}`;
    }
  }

  if (skill.skillPath) {
    return skill.skillPath;
  }

  return undefined;
}

function sourceLabel(skill: CatalogSkill, copy: ReturnType<typeof staticPageCopy>["skills"]): string {
  if (skill.sourceType === "external") return "skills.sh";
  if (skill.sourceType === "bundled") return copy.sourceBundledDetail;
  return copy.sourceLocalDetail;
}

function readableList(items: string[], locale: Locale): string {
  if (items.length <= 1) return items[0] ?? "";
  if (locale === "zh-hans") {
    return items.length === 2 ? `${items[0]}和${items[1]}` : `${items.slice(0, -1).join("、")}和${items[items.length - 1]}`;
  }
  if (locale === "ru") {
    return items.length === 2 ? `${items[0]} и ${items[1]}` : `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
  }
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function skillUseCases(skill: CatalogSkill, apps: SkillAppRef[], locale: Locale): Array<{ title: string; body: string }> {
  const copy = staticPageCopy(locale).skills;
  const appNames = apps.slice(0, 4).map((app) => app.name);
  const appPhrase = appNames.length > 0 ? readableList(appNames, locale) : copy.fallbackApp;
  const categories = skill.categories.slice(0, 3).map((category) => category.replaceAll("-", " "));
  const categoryPhrase = categories.length > 0 ? readableList(categories, locale) : copy.fallbackCategory;

  return [
    {
      title: copy.beforeToolCalls,
      body: formatMessage(copy.beforeToolCallsBody, { skill: skill.displayName, apps: appPhrase }),
    },
    {
      title: copy.duringImplementation,
      body: formatMessage(copy.duringImplementationBody, { categories: categoryPhrase }),
    },
    {
      title: copy.forReview,
      body: copy.forReviewBody,
    },
  ];
}

function pairingCopy(skill: CatalogSkill, apps: SkillAppRef[], locale: Locale): string {
  const copy = staticPageCopy(locale).skills;
  if (apps.length === 0) {
    return formatMessage(copy.pairingCopyEmpty, { skill: skill.displayName });
  }

  return formatMessage(copy.pairingCopy, {
    skill: skill.displayName,
    apps: readableList(apps.slice(0, 5).map((app) => app.name), locale),
  });
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}) {
  const skillId = skillIdFromSegments((await params).id);
  const [{ locale, messages: t }, skill, apps] = await Promise.all([
    getI18n(),
    getSkillById(skillId),
    listAppsForSkill(skillId),
  ]);

  if (!skill) {
    notFound();
  }

  const copy = staticPageCopy(locale).skills;
  const href = (path: string) => localizedPath(path, locale);
  const command = installCommand(skill);
  const useCases = skillUseCases(skill, apps, locale);
  const faqs = [
    {
      question: formatMessage(copy.faqWhenQuestion, { skill: skill.displayName }),
      answer: formatMessage(copy.faqWhenAnswer, { skill: skill.displayName }),
    },
    {
      question: formatMessage(copy.faqPairsQuestion, { skill: skill.displayName }),
      answer: apps.length > 0
        ? formatMessage(copy.faqPairsAnswer, { skill: skill.displayName, apps: readableList(apps.slice(0, 6).map((app) => app.name), locale) })
        : formatMessage(copy.faqPairsEmpty, { skill: skill.displayName }),
    },
  ];

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <nav className="crumbs">
          <Link href={href("/skills")}>{copy.eyebrow}</Link>
          <svg fill="none" viewBox="0 0 24 24">
            <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
          <span>{skill.displayName}</span>
        </nav>

        <header className="skill-detail-head">
          <div>
            <p className="eyebrow">{sourceLabel(skill, copy)}</p>
            <h1>{skill.displayName}</h1>
            <p>{skill.description}</p>
          </div>
          {skill.sourceUrl ? (
            <a className="btn-connect" href={skill.sourceUrl} rel="noreferrer" target="_blank">
              {copy.openSource}
            </a>
          ) : null}
        </header>

        <section className="detail-section">
          <h2 className="section-title">{copy.whenToUse}</h2>
          <p className="skill-section-copy">{pairingCopy(skill, apps, locale)}</p>
          <ul className="tool-list tool-table skill-use-list">
            {useCases.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-section">
          <h2 className="section-title">{copy.metadata}</h2>
          <div className="info-table">
            <div className="info-row">
              <div className="info-key">{copy.skillId}</div>
              <div className="info-val"><code>{skill.id}</code></div>
            </div>
            <div className="info-row">
              <div className="info-key">{copy.source}</div>
              <div className="info-val">{sourceLabel(skill, copy)}</div>
            </div>
            <div className="info-row">
              <div className="info-key">{copy.status}</div>
              <div className="info-val">{skill.status}</div>
            </div>
            {command ? (
              <div className="info-row">
                <div className="info-key">{copy.install}</div>
                <div className="info-val"><code>{command}</code></div>
              </div>
            ) : null}
          </div>
          <div className="skill-tags skill-detail-tags">
            {[...skill.categories, ...skill.tags].map((tag) => (
              <span key={tag}>{tag.replace(/^installs-/, "installs ")}</span>
            ))}
          </div>
        </section>

        <section className="detail-section">
          <h2 className="section-title">{copy.pairedApps}</h2>
          {apps.length === 0 ? (
            <p className="skill-section-copy">{copy.noPairs}</p>
          ) : (
            <div className="app-grid related-app-grid">
              {apps.map((app) => (
                <AppCard app={app} key={app.id} locale={locale} messages={t} />
              ))}
            </div>
          )}
        </section>
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          breadcrumbJsonLd([
            { name: copy.eyebrow, path: "/skills" },
            { name: skill.displayName, path: skillPath(skill.id) },
          ]),
          itemListJsonLd(
            apps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            formatMessage(copy.pairedAppsListName, { skill: skill.displayName }),
          ),
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

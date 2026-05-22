import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppCard } from "@/components/app-card";
import { getSkillById, listAppsForSkill } from "@/lib/data";
import { getI18n } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, jsonLdScript, pageMetadata, truncateMeta } from "@/lib/seo";
import { skillIdFromSegments, skillPath } from "@/lib/skill-routes";
import type { CatalogSkill, SkillAppRef } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}): Promise<Metadata> {
  const [{ locale }, { id }] = await Promise.all([getI18n(), params]);
  const skillId = skillIdFromSegments(id);
  const [skill, apps] = await Promise.all([getSkillById(skillId), listAppsForSkill(skillId)]);
  if (!skill) {
    return {};
  }
  const appPhrase = apps.length > 0
    ? ` Paired MCP apps include ${apps.slice(0, 3).map((app) => app.name).join(", ")}.`
    : "";

  return pageMetadata({
    title: `${skill.displayName} agent skill`,
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

function sourceLabel(skill: CatalogSkill): string {
  if (skill.sourceType === "external") return "skills.sh";
  if (skill.sourceType === "bundled") return "Bundled skill";
  return "Local skill";
}

function readableList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function skillUseCases(skill: CatalogSkill, apps: SkillAppRef[]): Array<{ title: string; body: string }> {
  const appNames = apps.slice(0, 4).map((app) => app.name);
  const appPhrase = appNames.length > 0 ? readableList(appNames) : "an MCP app";
  const categories = skill.categories.slice(0, 3).map((category) => category.replaceAll("-", " "));
  const categoryPhrase = categories.length > 0 ? readableList(categories) : "tool";

  return [
    {
      title: "Before tool calls",
      body: `Use ${skill.displayName} before an agent calls ${appPhrase} so the model has workflow rules, naming conventions, and safety checks in context.`,
    },
    {
      title: "During implementation",
      body: `Pair it with ${categoryPhrase} workflows when the agent needs domain-specific guidance instead of only raw MCP tool schemas.`,
    },
    {
      title: "For review",
      body: "Use the skill as a review checklist for permissions, generated code, database changes, deployments, or other write-capable actions.",
    },
  ];
}

function pairingCopy(skill: CatalogSkill, apps: SkillAppRef[]): string {
  if (apps.length === 0) {
    return `${skill.displayName} is available in the skills catalog but does not have curated MCP app pairings yet.`;
  }

  return `${skill.displayName} is curated for ${readableList(apps.slice(0, 5).map((app) => app.name))}. These pairings help agents combine tool access with task-specific operating guidance.`;
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

  const href = (path: string) => localizedPath(path, locale);
  const command = installCommand(skill);
  const useCases = skillUseCases(skill, apps);
  const faqs = [
    {
      question: `When should I use the ${skill.displayName} skill?`,
      answer: `${skill.displayName} is useful when an agent needs workflow-specific guidance before using paired MCP apps or related tools.`,
    },
    {
      question: `Which MCP apps pair with ${skill.displayName}?`,
      answer: apps.length > 0
        ? `${skill.displayName} is currently paired with ${readableList(apps.slice(0, 6).map((app) => app.name))}.`
        : `${skill.displayName} does not have curated MCP app pairings yet.`,
    },
  ];

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <nav className="crumbs">
          <Link href={href("/skills")}>Skills</Link>
          <svg fill="none" viewBox="0 0 24 24">
            <path d="M9 18 15 12 9 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
          <span>{skill.displayName}</span>
        </nav>

        <header className="skill-detail-head">
          <div>
            <p className="eyebrow">{sourceLabel(skill)}</p>
            <h1>{skill.displayName}</h1>
            <p>{skill.description}</p>
          </div>
          {skill.sourceUrl ? (
            <a className="btn-connect" href={skill.sourceUrl} rel="noreferrer" target="_blank">
              Open source
            </a>
          ) : null}
        </header>

        <section className="detail-section">
          <h2 className="section-title">When to use this skill</h2>
          <p className="skill-section-copy">{pairingCopy(skill, apps)}</p>
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
          <h2 className="section-title">Skill metadata</h2>
          <div className="info-table">
            <div className="info-row">
              <div className="info-key">Skill ID</div>
              <div className="info-val"><code>{skill.id}</code></div>
            </div>
            <div className="info-row">
              <div className="info-key">Source</div>
              <div className="info-val">{sourceLabel(skill)}</div>
            </div>
            <div className="info-row">
              <div className="info-key">Status</div>
              <div className="info-val">{skill.status}</div>
            </div>
            {command ? (
              <div className="info-row">
                <div className="info-key">Install</div>
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
          <h2 className="section-title">Paired MCP apps</h2>
          {apps.length === 0 ? (
            <p className="skill-section-copy">No curated MCP app associations yet.</p>
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
            { name: "Skills", path: "/skills" },
            { name: skill.displayName, path: skillPath(skill.id) },
          ]),
          itemListJsonLd(
            apps.map((app) => ({ name: app.name, path: `/app/${app.id}` })),
            `${skill.displayName} paired MCP apps`,
          ),
          faqJsonLd(faqs),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

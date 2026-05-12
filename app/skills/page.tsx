import type { Metadata } from "next";
import Link from "next/link";

import { listSkills } from "@/lib/data";
import { getI18n } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";
import { itemListJsonLd, jsonLdScript, pageMetadata, truncateMeta } from "@/lib/seo";
import { skillPath } from "@/lib/skill-routes";
import type { CatalogSkill, SkillSourceType } from "@/lib/types";

const sourceTypes: SkillSourceType[] = ["bundled", "local", "external"];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; category?: string }>;
}): Promise<Metadata> {
  const { q = "", source = "", category = "" } = await searchParams;
  const filters = [q.trim(), source.trim(), category.trim()].filter(Boolean);
  return pageMetadata({
    title: filters.length > 0 ? `Agent skills matching ${truncateMeta(filters.join(" "), 64)}` : "Agent skills directory",
    description: "Browse agent skills that pair with MCP apps, ChatGPT apps, Claude connectors, and MCP servers.",
    path: "/skills",
  });
}

function sourceLabel(sourceType: string): string {
  if (sourceType === "external") return "skills.sh";
  if (sourceType === "bundled") return "Bundled";
  return "Local";
}

function searchText(skill: CatalogSkill): string {
  return [
    skill.id,
    skill.name,
    skill.displayName,
    skill.description,
    skill.sourceType,
    skill.sourceUrl,
    skill.installUrl,
    skill.skillPath,
    ...(skill.platforms ?? []),
    ...skill.categories,
    ...skill.tags,
  ].join(" ").toLowerCase();
}

function queryPath(params: { q?: string; source?: string; category?: string }): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.source) query.set("source", params.source);
  if (params.category) query.set("category", params.category);
  const value = query.toString();
  return value ? `/skills?${value}` : "/skills";
}

export default async function SkillsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; category?: string }>;
}) {
  const [{ locale }, skills, params] = await Promise.all([getI18n(), listSkills(), searchParams]);
  const href = (path: string) => localizedPath(path, locale);
  const q = (params.q ?? "").trim();
  const source = sourceTypes.includes(params.source as SkillSourceType) ? params.source : "";
  const category = (params.category ?? "").trim();
  const normalizedQuery = q.toLowerCase();
  const filteredSkills = skills.filter((skill) => {
    if (source && skill.sourceType !== source) return false;
    if (category && !skill.categories.includes(category)) return false;
    if (normalizedQuery && !searchText(skill).includes(normalizedQuery)) return false;
    return true;
  });
  const externalCount = skills.filter((skill) => skill.sourceType === "external").length;
  const localCount = skills.length - externalCount;
  const categories = Array.from(new Set(skills.flatMap((skill) => skill.categories))).sort();
  const activeFilterCount = [q, source, category].filter(Boolean).length;

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">Skills</p>
          <h1>Agent skills directory</h1>
          <p className="section-copy">
            Browse reusable skills that pair with MCP apps so agents know when to use a connected tool, how to use it safely, and what workflow rules to follow.
          </p>
        </div>

        <div className="app-index-metrics" aria-label="Skill directory counts">
          <div>
            <strong>{skills.length}</strong>
            <span>Total skills</span>
          </div>
          <div>
            <strong>{externalCount}</strong>
            <span>skills.sh imports</span>
          </div>
          <div>
            <strong>{localCount}</strong>
            <span>Local and bundled</span>
          </div>
        </div>

        <div className="skill-category-strip" aria-label="Skill categories">
          <Link className={!category ? "active" : ""} href={href(queryPath({ q, source }))} prefetch={false}>
            All categories
          </Link>
          {categories.slice(0, 16).map((category) => (
            <Link
              className={params.category === category ? "active" : ""}
              href={href(queryPath({ q, source, category }))}
              key={category}
              prefetch={false}
            >
              {category.replaceAll("-", " ")}
            </Link>
          ))}
        </div>

        <form action={href("/skills")} className="skill-filter-panel">
          <div className="search-form">
            <input defaultValue={q} name="q" placeholder="Search skills, tags, sources, or paired workflows" />
            {source ? <input name="source" type="hidden" value={source} /> : null}
            {category ? <input name="category" type="hidden" value={category} /> : null}
            <button className="primary-link" type="submit">Search</button>
          </div>
          <div className="skill-source-filters" aria-label="Skill source filters">
            <Link className={!source ? "active" : ""} href={href(queryPath({ q, category }))} prefetch={false}>
              All sources
            </Link>
            {sourceTypes.map((sourceType) => (
              <Link
                className={source === sourceType ? "active" : ""}
                href={href(queryPath({ q, source: sourceType, category }))}
                key={sourceType}
                prefetch={false}
              >
                {sourceLabel(sourceType)}
              </Link>
            ))}
            {activeFilterCount > 0 ? (
              <Link href={href("/skills")} prefetch={false}>Clear filters</Link>
            ) : null}
          </div>
        </form>

        <p className="skill-result-count">
          Showing {filteredSkills.length} of {skills.length} skills
        </p>

        <section className="skill-directory-grid" aria-label="Agent skills">
          {filteredSkills.map((skill) => (
            <article className="skill-directory-card" key={skill.id}>
              <div className="skill-card-top">
                <span className="skill-relation">{sourceLabel(skill.sourceType)}</span>
                <span className="skill-confidence">{skill.status}</span>
              </div>
              <h2>
                <Link href={href(skillPath(skill.id))} prefetch={false}>
                  {skill.displayName}
                </Link>
              </h2>
              <p>{skill.description}</p>
              <div className="skill-tags">
                {[...skill.categories, ...skill.tags].slice(0, 5).map((tag) => (
                  <span key={tag}>{tag.replace(/^installs-/, "installs ")}</span>
                ))}
              </div>
            </article>
          ))}
        </section>
      </section>
      <script
        dangerouslySetInnerHTML={jsonLdScript([
          itemListJsonLd(
            filteredSkills.slice(0, 100).map((skill) => ({ name: skill.displayName, path: skillPath(skill.id) })),
            "Agent skills directory",
          ),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

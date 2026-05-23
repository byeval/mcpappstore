import type { Metadata } from "next";
import Link from "next/link";

import { listSkills } from "@/lib/data";
import { getI18n } from "@/lib/i18n-server";
import { formatMessage, localizedPath } from "@/lib/i18n";
import { itemListJsonLd, jsonLdScript, pageMetadata, truncateMeta } from "@/lib/seo";
import { skillPath } from "@/lib/skill-routes";
import { staticPageCopy } from "@/lib/static-page-i18n";
import type { CatalogSkill, SkillSourceType } from "@/lib/types";

const sourceTypes: SkillSourceType[] = ["bundled", "local", "external"];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; category?: string }>;
}): Promise<Metadata> {
  const [{ locale }, { q = "", source = "", category = "" }] = await Promise.all([getI18n(), searchParams]);
  const copy = staticPageCopy(locale).skills;
  const filters = [q.trim(), source.trim(), category.trim()].filter(Boolean);
  return pageMetadata({
    title: filters.length > 0
      ? formatMessage(copy.filteredMetaTitle, { filters: truncateMeta(filters.join(" "), 64) })
      : copy.metaTitle,
    description: copy.metaDescription,
    path: "/skills",
    locale,
  });
}

function sourceLabel(sourceType: string, copy: ReturnType<typeof staticPageCopy>["skills"]): string {
  if (sourceType === "external") return "skills.sh";
  if (sourceType === "bundled") return copy.sourceBundled;
  return copy.sourceLocal;
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
  const copy = staticPageCopy(locale).skills;
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
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="section-copy">{copy.intro}</p>
        </div>

        <div className="app-index-metrics" aria-label={copy.metricsAria}>
          <div>
            <strong>{skills.length}</strong>
            <span>{copy.totalSkills}</span>
          </div>
          <div>
            <strong>{externalCount}</strong>
            <span>{copy.externalImports}</span>
          </div>
          <div>
            <strong>{localCount}</strong>
            <span>{copy.localAndBundled}</span>
          </div>
        </div>

        <div className="skill-category-strip" aria-label={copy.categoriesAria}>
          <Link className={!category ? "active" : ""} href={href(queryPath({ q, source }))} prefetch={false}>
            {copy.allCategories}
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
            <input defaultValue={q} name="q" placeholder={copy.searchPlaceholder} />
            {source ? <input name="source" type="hidden" value={source} /> : null}
            {category ? <input name="category" type="hidden" value={category} /> : null}
            <button className="primary-link" type="submit">{copy.search}</button>
          </div>
          <div className="skill-source-filters" aria-label={copy.sourceFiltersAria}>
            <Link className={!source ? "active" : ""} href={href(queryPath({ q, category }))} prefetch={false}>
              {copy.allSources}
            </Link>
            {sourceTypes.map((sourceType) => (
              <Link
                className={source === sourceType ? "active" : ""}
                href={href(queryPath({ q, source: sourceType, category }))}
                key={sourceType}
                prefetch={false}
              >
                {sourceLabel(sourceType, copy)}
              </Link>
            ))}
            {activeFilterCount > 0 ? (
              <Link href={href("/skills")} prefetch={false}>{copy.clearFilters}</Link>
            ) : null}
          </div>
        </form>

        <p className="skill-result-count">
          {formatMessage(copy.resultCount, { visible: filteredSkills.length, total: skills.length })}
        </p>

        <section className="skill-directory-grid" aria-label={copy.gridAria}>
          {filteredSkills.map((skill) => (
            <article className="skill-directory-card" key={skill.id}>
              <div className="skill-card-top">
                <span className="skill-relation">{sourceLabel(skill.sourceType, copy)}</span>
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
            copy.jsonLdName,
          ),
        ])}
        type="application/ld+json"
      />
    </div>
  );
}

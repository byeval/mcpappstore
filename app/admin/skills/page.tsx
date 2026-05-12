import type { Metadata } from "next";
import Link from "next/link";

import curatedAssociationsJson from "@/seed/app-skill-associations.json";
import catalogJson from "@/seed/chatgpt-apps.json";
import rejectedAssociationsJson from "@/seed/rejected-skill-associations.json";
import skillRegistryJson from "@/seed/skills.json";
import { suggestSkillAssociations } from "@/lib/skill-matching";
import { skillPath } from "@/lib/skill-routes";
import type { SeedCatalog, SeedRejectedSkillAssociation, SeedSkillAssociation, SeedSkillRegistry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Skill association review | MCP App Store",
  robots: {
    index: false,
    follow: false,
  },
};

const catalog = catalogJson as SeedCatalog;
const skills = skillRegistryJson as SeedSkillRegistry;
const curatedAssociations = curatedAssociationsJson as SeedSkillAssociation[];
const rejectedAssociations = rejectedAssociationsJson as SeedRejectedSkillAssociation[];

function commandFor(action: "accept" | "reject", appId: string, skillId: string): string {
  return `npm run skills:review -- --${action} ${appId} ${skillId}`;
}

export default function AdminSkillsPage() {
  const candidates = suggestSkillAssociations({
    apps: catalog.apps,
    skills: skills.skills,
    curatedAssociations,
    rejectedAssociations,
    threshold: 120,
  }).slice(0, 80);
  const publishedApps = catalog.apps.filter((app) => app.status === "published");
  const appIdsWithSkills = new Set(curatedAssociations.map((association) => association.appId));
  const skillIdsWithApps = new Set(curatedAssociations.map((association) => association.skillId));
  const appsWithoutSkills = publishedApps
    .filter((app) => !appIdsWithSkills.has(app.id))
    .sort((left, right) => left.name.localeCompare(right.name));
  const skillsWithoutApps = skills.skills
    .filter((skill) => !skillIdsWithApps.has(skill.id))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
  const lowConfidenceAssociations = curatedAssociations
    .filter((association) => (association.confidence ?? 1) < 0.8)
    .sort((left, right) => (left.confidence ?? 0) - (right.confidence ?? 0));
  const externalSkills = skills.skills.filter((skill) => skill.sourceType === "external");
  const coverage = Math.round(((publishedApps.length - appsWithoutSkills.length) / publishedApps.length) * 100);

  return (
    <div className="page-stack">
      <section className="catalog-shell compact-shell">
        <div className="section-head">
          <p className="eyebrow">Skill review</p>
          <h1>Skill association candidates</h1>
          <p className="section-copy">
            High-scoring matches from the local catalog and skills registry. Accept or reject with the review CLI, then run the seed job.
          </p>
        </div>

        <div className="app-index-metrics" aria-label="Skill association review counts">
          <div>
            <strong>{curatedAssociations.length}</strong>
            <span>Curated</span>
          </div>
          <div>
            <strong>{rejectedAssociations.length}</strong>
            <span>Rejected</span>
          </div>
          <div>
            <strong>{candidates.length}</strong>
            <span>Open candidates</span>
          </div>
        </div>

        <section className="skill-health-grid" aria-label="Skill association health">
          <article>
            <span>App coverage</span>
            <strong>{coverage}%</strong>
            <p>{publishedApps.length - appsWithoutSkills.length} of {publishedApps.length} published apps have at least one skill.</p>
          </article>
          <article>
            <span>Apps without skills</span>
            <strong>{appsWithoutSkills.length}</strong>
            <p>{appsWithoutSkills.slice(0, 6).map((app) => app.name).join(", ") || "All published apps are covered."}</p>
          </article>
          <article>
            <span>Skills without apps</span>
            <strong>{skillsWithoutApps.length}</strong>
            <p>{skillsWithoutApps.slice(0, 6).map((skill) => skill.displayName).join(", ") || "All skills are paired."}</p>
          </article>
          <article>
            <span>skills.sh imports</span>
            <strong>{externalSkills.length}</strong>
            <p>{externalSkills.filter((skill) => skill.id.startsWith("skills-sh:")).length} imported from the public skills.sh directory.</p>
          </article>
          <article>
            <span>Low confidence</span>
            <strong>{lowConfidenceAssociations.length}</strong>
            <p>{lowConfidenceAssociations.slice(0, 5).map((item) => `${item.appId} -> ${item.skillId}`).join(", ") || "No low-confidence curated rows."}</p>
          </article>
          <article>
            <span>Rejected false positives</span>
            <strong>{rejectedAssociations.length}</strong>
            <p>{rejectedAssociations.slice(0, 5).map((item) => `${item.appId} -> ${item.skillId}`).join(", ") || "No rejected candidates yet."}</p>
          </article>
        </section>

        <div className="skill-review-table" role="table" aria-label="Skill association candidates">
          <div className="skill-review-row head" role="row">
            <span>App</span>
            <span>Skill</span>
            <span>Score</span>
            <span>Review commands</span>
          </div>
          {candidates.map((candidate) => (
            <div className="skill-review-row" role="row" key={`${candidate.appId}:${candidate.skillId}`}>
              <span>
                <Link href={`/app/${candidate.appId}`} prefetch={false}>{candidate.appName}</Link>
                <small>{candidate.appId}</small>
              </span>
              <span>
                <Link href={skillPath(candidate.skillId)} prefetch={false}>{candidate.skillName}</Link>
                <small>{candidate.signals.slice(0, 2).join("; ")}</small>
              </span>
              <span>
                <strong>{candidate.score}</strong>
                <small>{Math.round(candidate.confidence * 100)}%</small>
              </span>
              <span className="skill-review-commands">
                <code>{commandFor("accept", candidate.appId, candidate.skillId)}</code>
                <code>{commandFor("reject", candidate.appId, candidate.skillId)}</code>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

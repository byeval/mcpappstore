import mcpClientsSeed from "@/seed/awesome-mcp-clients.json";

export interface McpClientScreenshot {
  alt: string;
  url: string;
}

export interface McpClient {
  id: string;
  name: string;
  summary: string;
  descriptionMarkdown: string;
  githubUrl?: string;
  websiteUrl?: string;
  license?: string;
  type?: string;
  platforms: string[];
  pricing?: string;
  programmingLanguages: string[];
  installCommands: string[];
  screenshots: McpClientScreenshot[];
  sourceUrl: string;
}

interface McpClientSeed {
  source: {
    name: string;
    repoUrl: string;
    readmeUrl: string;
  };
  generatedAt: string;
  clients: McpClient[];
}

const seed = mcpClientsSeed as McpClientSeed;
const clientsById = new Map(seed.clients.map((client) => [client.id, client]));

export const MCP_CLIENTS_SOURCE = seed.source;
export const MCP_CLIENTS_UPDATED_AT = seed.generatedAt;

function cloneClient(client: McpClient): McpClient {
  return {
    ...client,
    platforms: [...client.platforms],
    programmingLanguages: [...client.programmingLanguages],
    installCommands: [...client.installCommands],
    screenshots: client.screenshots.map((screenshot) => ({ ...screenshot })),
  };
}

function overlapCount(left: readonly string[], right: readonly string[]): number {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.reduce((count, item) => count + (rightSet.has(item.toLowerCase()) ? 1 : 0), 0);
}

export function listMcpClients(): McpClient[] {
  return seed.clients.map(cloneClient);
}

export function getMcpClientById(id: string): McpClient | null {
  const client = clientsById.get(id);
  return client ? cloneClient(client) : null;
}

export function listMcpClientSitemapEntries(): Array<{ id: string; name: string; updatedAt: number }> {
  const updatedAt = new Date(MCP_CLIENTS_UPDATED_AT).getTime();
  return seed.clients.map((client) => ({
    id: client.id,
    name: client.name,
    updatedAt,
  }));
}

export function listMcpClientTypeSummaries(limit = 8): Array<{ type: string; count: number }> {
  const countByType = new Map<string, number>();

  for (const client of seed.clients) {
    const type = client.type ?? "Unspecified";
    countByType.set(type, (countByType.get(type) ?? 0) + 1);
  }

  return [...countByType.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type))
    .slice(0, limit);
}

export function listMcpClientPlatformSummaries(limit = 10): Array<{ platform: string; count: number }> {
  const countByPlatform = new Map<string, number>();

  for (const client of seed.clients) {
    for (const platform of client.platforms) {
      countByPlatform.set(platform, (countByPlatform.get(platform) ?? 0) + 1);
    }
  }

  return [...countByPlatform.entries()]
    .map(([platform, count]) => ({ platform, count }))
    .sort((left, right) => right.count - left.count || left.platform.localeCompare(right.platform))
    .slice(0, limit);
}

export function relatedMcpClients(client: McpClient, limit = 6): McpClient[] {
  return seed.clients
    .filter((candidate) => candidate.id !== client.id)
    .map((candidate) => {
      const score =
        (client.type && candidate.type === client.type ? 12 : 0) +
        overlapCount(client.platforms, candidate.platforms) * 4 +
        overlapCount(client.programmingLanguages, candidate.programmingLanguages) * 2 +
        (client.pricing && candidate.pricing === client.pricing ? 1 : 0);

      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name))
    .slice(0, limit)
    .map((item) => cloneClient(item.candidate));
}

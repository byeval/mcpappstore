import { z } from "zod";

const itemSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  oneLiner: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  serverUrl: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  authorUrl: z.string().nullable().optional(),
  type: z.enum(["remote", "local"]),
  categories: z.array(z.string()).nullable().optional(),
  worksWith: z.array(z.string()).nullable().optional(),
  hasMcpApp: z.boolean().optional(),
  directoryUrl: z.string().url().refine((value) => new URL(value).hostname === "claude.ai"),
  addedAt: z.string().nullable().optional(),
});

export type PublicDirectoryItem = z.infer<typeof itemSchema>;

export function extractPublicDirectoryItems(html: string): PublicDirectoryItem[] | undefined {
  const chunks: string[] = [];
  for (const match of html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)) {
    const frame = JSON.parse(match[1]);
    if (typeof frame[1] === "string") chunks.push(frame[1]);
  }

  let items: PublicDirectoryItem[] | undefined;
  function visit(value: unknown): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items) && record.items.some((item) => item?.directoryUrl)) {
      if (items) throw new Error("Multiple Claude connector collections found");
      items = z.array(itemSchema).parse(record.items);
      return;
    }
    Object.values(record).forEach(visit);
  }

  // Flight records may be split across script chunks; text/module records are not JSON data.
  for (const line of chunks.join("").split("\n")) {
    const payload = line.slice(line.indexOf(":") + 1);
    if (!payload.startsWith("[") && !payload.startsWith("{")) continue;
    let value: unknown;
    try {
      value = JSON.parse(payload);
    } catch {
      continue;
    }
    visit(value);
  }

  const visibleText = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  const advertisedCount = visibleText.match(/All connectors\s+([\d,]+)\s+connectors/i)?.[1];
  if (advertisedCount && items?.length !== Number(advertisedCount.replaceAll(",", ""))) {
    throw new Error(`Claude directory coverage mismatch: expected ${advertisedCount}, parsed ${items?.length ?? 0}`);
  }
  if (items && new Set(items.map((item) => item.directoryUrl)).size !== items.length) {
    throw new Error("Duplicate Claude directory IDs");
  }
  return items;
}

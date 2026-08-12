import { z } from "zod";

export const logSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  level: z.enum(["debug", "info", "warn", "error"]),
  service: z.string().min(1),
  message: z.string().min(1),

  attributes: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()])
  ).default({}),
});

export const requestSchema = z.object({
  logs: z.array(z.unknown()),
});

export function validateTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "invalid timestamp";
  }

  if (date.getTime() > Date.now() + 5 * 60 * 1000) {
    return "timestamp cannot be more than 5 minutes in the future";
  }

  return null;
}

export function parseQuery(query: any) {
  const level =
    query.level &&
    ["debug", "info", "warn", "error"].includes(query.level)
      ? query.level
      : undefined;

  if (query.level && !level) {
    throw new Error("invalid level");
  }

  const limit = Number(query.limit ?? 100);

  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("limit must be between 1 and 1000");
  }

  const since = query.since ? new Date(query.since) : undefined;
  const until = query.until ? new Date(query.until) : undefined;

  if (since && Number.isNaN(since.getTime())) {
    throw new Error("invalid since timestamp");
  }

  if (until && Number.isNaN(until.getTime())) {
    throw new Error("invalid until timestamp");
  }

  if (since && until && since >= until) {
    throw new Error("until must be later than since");
  }

  return {
    service: query.service,
    level,
    since,
    until,
    q: query.q,
    limit,
    cursor: query.cursor,

    attributes: Object.entries(query)
      .filter(([key]) => key.startsWith("attr."))
      .map(
        ([key, value]) =>
          [key.slice(5), String(value)] as [string, string]
      ),
  };
}
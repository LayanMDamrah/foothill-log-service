import { db } from "./db.js";

export async function insertLogs(logs: any[]) {
  if (!logs.length) return;

  await db.query(
    `
    INSERT INTO logs
      (timestamp, level, service, message, attributes)
    SELECT
      timestamp,
      level,
      service,
      message,
      attributes
    FROM jsonb_to_recordset($1::jsonb) AS x(
      timestamp timestamptz,
      level text,
      service text,
      message text,
      attributes jsonb
    )
    `,
    [JSON.stringify(logs)]
  );
}

function whereClause(filters: any, values: any[]) {
  const conditions: string[] = [];

  if (filters.service) {
    values.push(filters.service);
    conditions.push(`service = $${values.length}`);
  }

  if (filters.level) {
    values.push(filters.level);
    conditions.push(`level = $${values.length}`);
  }

  if (filters.since) {
    values.push(filters.since);
    conditions.push(`timestamp >= $${values.length}`);
  }

  if (filters.until) {
    values.push(filters.until);
    conditions.push(`timestamp < $${values.length}`);
  }

  if (filters.q) {
    values.push(`%${filters.q}%`);
    conditions.push(`message ILIKE $${values.length}`);
  }

  for (const [key, value] of filters.attributes) {
    values.push(key);
    const keyParam = `$${values.length}`;

    values.push(value);
    const valueParam = `$${values.length}`;

    conditions.push(
      `attributes ->> ${keyParam} = ${valueParam}`
    );
  }

  if (filters.cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(filters.cursor, "base64url").toString()
      );

      values.push(new Date(decoded.timestamp));
      const timeParam = `$${values.length}`;

      values.push(decoded.id);
      const idParam = `$${values.length}`;

      conditions.push(
        `(timestamp, id) < (${timeParam}, ${idParam})`
      );
    } catch {
      throw new Error("invalid cursor");
    }
  }

  return conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
}

export async function getLogs(filters: any) {
  const values: any[] = [];
  const where = whereClause(filters, values);

  values.push(filters.limit + 1);

  const result = await db.query(
    `
    SELECT
      id::text,
      timestamp,
      level,
      service,
      message,
      attributes
    FROM logs
    ${where}
    ORDER BY timestamp DESC, id DESC
    LIMIT $${values.length}
    `,
    values
  );

  const hasMore = result.rows.length > filters.limit;
  const logs = result.rows.slice(0, filters.limit);

  let next_cursor = null;

  if (hasMore && logs.length) {
    const last = logs[logs.length - 1];

    next_cursor = Buffer.from(
      JSON.stringify({
        timestamp: last.timestamp,
        id: last.id,
      })
    ).toString("base64url");
  }

  return {
    logs,
    next_cursor,
  };
}

export async function aggregateLogs(filters: any) {
  const intervals: any = {
    "1m": "1 minute",
    "5m": "5 minutes",
    "1h": "1 hour",
    "1d": "1 day",
  };

  if (!intervals[filters.bucket]) {
    throw new Error("invalid bucket");
  }

  const values: any[] = [];
  const where = whereClause(filters, values);

  values.push(intervals[filters.bucket]);
  const intervalParam = `$${values.length}`;

  const group =
    filters.group_by === "service"
      ? "service"
      : filters.group_by === "level"
        ? "level"
        : "NULL";

  const result = await db.query(
    `
    SELECT
      date_bin(
        ${intervalParam}::interval,
        timestamp,
        TIMESTAMPTZ '2000-01-01'
      ) AS start,
      ${group} AS "group",
      COUNT(*)::int AS count
    FROM logs
    ${where}
    GROUP BY 1, 2
    ORDER BY 1 ASC
    `,
    values
  );

  return result.rows;
}

export async function deleteOldLogs() {
  const days = Number(
    process.env.RETENTION_DAYS ?? 30
  );

  const batchSize = Number(
    process.env.RETENTION_BATCH_SIZE ?? 5000
  );

  let total = 0;

  while (true) {
    const result = await db.query(
      `
      DELETE FROM logs
      WHERE id IN (
        SELECT id
        FROM logs
        WHERE timestamp < NOW() - ($1 * INTERVAL '1 day')
        ORDER BY timestamp ASC
        LIMIT $2
      )
      `,
      [days, batchSize]
    );

    total += result.rowCount ?? 0;

    if ((result.rowCount ?? 0) < batchSize) {
      break;
    }
  }

  return total;
}
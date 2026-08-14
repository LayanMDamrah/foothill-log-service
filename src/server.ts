import "dotenv/config";

import Fastify from "fastify";

import {
  initDB,
  closeDB,
} from "./db.js";

import {
  logSchema,
  requestSchema,
  validateTimestamp,
  parseQuery,
  parseAggregateQuery,
} from "./validation.js";

import {
  insertLogs,
  getLogs,
  aggregateLogs,
  deleteOldLogs,
} from "./logs.js";

const app = Fastify({
  logger: true,
  bodyLimit: 16 * 1024 * 1024,
});

let ready = false;
let retentionTimer: NodeJS.Timeout | undefined;

/* HEALTH */

app.get("/health", async (_request, reply) => {
  if (!ready) {
    return reply
      .status(503)
      .send({ status: "starting" });
  }

  return reply
    .status(200)
    .send({ status: "ok" });
});

/* POST /logs */

app.post("/logs", async (request, reply) => {
  try {
    const body = requestSchema.parse(request.body);

    const valid: Array<
      ReturnType<typeof logSchema.parse>
    > = [];

    const rejected: Array<{
      index: number;
      reason: string;
    }> = [];

    body.logs.forEach((log, index) => {
      const result = logSchema.safeParse(log);

      if (!result.success) {
        rejected.push({
          index,
          reason: result.error.issues[0]?.message ?? "invalid log",
        });

        return;
      }

      const timestampError = validateTimestamp(
        result.data.timestamp,
      );

      if (timestampError) {
        rejected.push({
          index,
          reason: timestampError,
        });

        return;
      }

      valid.push(result.data);
    });

    if (valid.length > 0) {
      await insertLogs(valid);
    }

    return reply
      .status(valid.length > 0 ? 200 : 400)
      .send({
        accepted: valid.length,
        rejected,
      });
  } catch {
    return reply
      .status(400)
      .send({
        error: "request body must contain a logs array",
      });
  }
});

/* GET /logs */

app.get("/logs", async (request, reply) => {
  try {
    const filters = parseQuery(
      request.query as Record<string, unknown>,
    );

    return await getLogs(filters);
  } catch (error) {
    return reply
      .status(400)
      .send({
        error:
          error instanceof Error
            ? error.message
            : "invalid query",
      });
  }
});

/* GET /logs/aggregate */

app.get(
  "/logs/aggregate",
  async (request, reply) => {
    try {
      const params = parseAggregateQuery(
        request.query as Record<string, unknown>,
      );

      const buckets = await aggregateLogs(params);

      return reply
        .status(200)
        .send({ buckets });
    } catch (error) {
      return reply
        .status(400)
        .send({
          error:
            error instanceof Error
              ? error.message
              : "invalid query",
        });
    }
  },
);

/* START */

async function start(): Promise<void> {
  try {
    await initDB();

    await app.listen({
      port: Number(process.env.PORT ?? 8080),
      host: "0.0.0.0",
    });

    ready = true;

    const interval = Number(
      process.env.RETENTION_INTERVAL_MS ??
        60 * 60 * 1000,
    );

    retentionTimer = setInterval(async () => {
      try {
        await deleteOldLogs();
      } catch (error) {
        app.log.error(error);
      }
    }, interval);

    app.log.info(
      "Log ingestion service is ready",
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

/* SHUTDOWN */

async function shutdown(): Promise<void> {
  if (retentionTimer) {
    clearInterval(retentionTimer);
  }

  ready = false;

  await app.close();
  await closeDB();

  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("SIGINT", () => {
  void shutdown();
});

void start();
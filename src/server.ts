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

/* HEALTH */

app.get("/health", async (_, reply) => {
  if (!ready) {
    return reply
      .status(503)
      .send({ status: "starting" });
  }

  return { status: "ok" };
});

/* POST /logs */

app.post("/logs", async (request, reply) => {
  try {
    const body = requestSchema.parse(request.body);

    const valid: any[] = [];
    const rejected: any[] = [];

    body.logs.forEach((log, index) => {
      const result = logSchema.safeParse(log);

      if (!result.success) {
        rejected.push({
          index,
          reason: result.error.issues[0].message,
        });
        return;
      }

      const timestampError =
        validateTimestamp(result.data.timestamp);

      if (timestampError) {
        rejected.push({
          index,
          reason: timestampError,
        });
        return;
      }

      valid.push(result.data);
    });

    if (valid.length) {
      await insertLogs(valid);
    }

    const result = {
      accepted: valid.length,
      rejected,
    };

    return reply
      .status(valid.length ? 200 : 400)
      .send(result);

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
    const filters = parseQuery(request.query);

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
      const query: any = request.query;

      if (!query.since || !query.until) {
        throw new Error(
          "since and until are required"
        );
      }

      const filters = {
        ...parseQuery(query),
        bucket: query.bucket ?? "1h",
        group_by: query.group_by,
      };

      return {
        buckets:
          await aggregateLogs(filters),
      };

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
  }
);

/* START */

async function start() {
  try {
    await initDB();

    await app.listen({
      port: Number(process.env.PORT ?? 8080),
      host: "0.0.0.0",
    });

    ready = true;

    const interval = Number(
      process.env.RETENTION_INTERVAL_MS ??
      60 * 60 * 1000
    );

    setInterval(async () => {
      try {
        await deleteOldLogs();
      } catch (error) {
        app.log.error(error);
      }
    }, interval);

    app.log.info(
      "Log ingestion service is ready"
    );

  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await closeDB();
  process.exit(0);
});

start();
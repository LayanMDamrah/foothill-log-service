import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  logSchema,
  validateTimestamp,
  parseQuery,
  parseAggregateQuery,
} from "../src/validation.js";

describe("Log validation", () => {
  it("accepts a valid log", () => {
    const result = logSchema.safeParse({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "api",
      message: "request completed",
      attributes: {
        user_id: "42",
        retries: 3,
        success: true,
      },
    });

    assert.equal(result.success, true);
  });

  it("rejects an invalid log level", () => {
    const result = logSchema.safeParse({
      timestamp: new Date().toISOString(),
      level: "critical",
      service: "api",
      message: "failed",
    });

    assert.equal(result.success, false);
  });

  it("rejects an empty service", () => {
    const result = logSchema.safeParse({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "",
      message: "test",
    });

    assert.equal(result.success, false);
  });

  it("rejects an empty message", () => {
    const result = logSchema.safeParse({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "api",
      message: "",
    });

    assert.equal(result.success, false);
  });

  it("rejects nested attributes", () => {
    const result = logSchema.safeParse({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "api",
      message: "test",
      attributes: {
        user: {
          id: 42,
        },
      },
    });

    assert.equal(result.success, false);
  });

  it("rejects array attributes", () => {
    const result = logSchema.safeParse({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "api",
      message: "test",
      attributes: {
        tags: ["api", "test"],
      },
    });

    assert.equal(result.success, false);
  });

  it("rejects timestamps more than five minutes in the future", () => {
    const future = new Date(
      Date.now() + 10 * 60 * 1000,
    ).toISOString();

    const result = validateTimestamp(future);

    assert.equal(
      result,
      "timestamp cannot be more than 5 minutes in the future",
    );
  });

  it("accepts a current timestamp", () => {
    const result = validateTimestamp(
      new Date().toISOString(),
    );

    assert.equal(result, null);
  });
});

describe("Query parsing", () => {
  it("uses default limit of 100", () => {
    const result = parseQuery({});

    assert.equal(result.limit, 100);
  });

  it("accepts service and level filters", () => {
    const result = parseQuery({
      service: "checkout",
      level: "error",
    });

    assert.equal(result.service, "checkout");
    assert.equal(result.level, "error");
  });

  it("accepts attribute filters", () => {
    const result = parseQuery({
      "attr.user_id": "42",
      "attr.region": "eu-west",
    });

    assert.deepEqual(result.attributes, [
      ["user_id", "42"],
      ["region", "eu-west"],
    ]);
  });

  it("rejects an invalid level", () => {
    assert.throws(() => {
      parseQuery({
        level: "critical",
      });
    });
  });

  it("rejects a limit greater than 1000", () => {
    assert.throws(() => {
      parseQuery({
        limit: "1001",
      });
    });
  });

  it("rejects a non-numeric limit", () => {
    assert.throws(() => {
      parseQuery({
        limit: "abc",
      });
    });
  });

  it("rejects an invalid time range", () => {
    assert.throws(() => {
      parseQuery({
        since: "2026-07-20T15:00:00Z",
        until: "2026-07-20T14:00:00Z",
      });
    });
  });
});

describe("Aggregation query parsing", () => {
  const baseQuery = {
    since: "2026-07-20T14:00:00Z",
    until: "2026-07-20T15:00:00Z",
  };

  it("accepts a 1m bucket", () => {
    const result = parseAggregateQuery({
      ...baseQuery,
      bucket: "1m",
    });

    assert.equal(result.bucket, "1m");
  });

  it("accepts group_by service", () => {
    const result = parseAggregateQuery({
      ...baseQuery,
      bucket: "5m",
      group_by: "service",
    });

    assert.equal(result.groupBy, "service");
  });

  it("accepts group_by level", () => {
    const result = parseAggregateQuery({
      ...baseQuery,
      bucket: "1h",
      group_by: "level",
    });

    assert.equal(result.groupBy, "level");
  });

  it("rejects an invalid bucket", () => {
    assert.throws(() => {
      parseAggregateQuery({
        ...baseQuery,
        bucket: "10m",
      });
    });
  });

  it("requires since", () => {
    assert.throws(() => {
      parseAggregateQuery({
        until: baseQuery.until,
        bucket: "1m",
      });
    });
  });

  it("requires until", () => {
    assert.throws(() => {
      parseAggregateQuery({
        since: baseQuery.since,
        bucket: "1m",
      });
    });
  });

  it("rejects an invalid group_by value", () => {
    assert.throws(() => {
      parseAggregateQuery({
        ...baseQuery,
        bucket: "1m",
        group_by: "message",
      });
    });
  });
});
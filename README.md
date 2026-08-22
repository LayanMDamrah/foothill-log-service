# Structured Log Service

A backend service for collecting, storing, searching, and aggregating structured application logs.

Built with **TypeScript, Fastify, PostgreSQL, Zod, and Docker Compose**.

## Features

* Batch log ingestion
* Per-log validation with partial batch acceptance
* PostgreSQL JSONB attributes
* Time-based PostgreSQL partitioning
* Filtering by service and log level
* Time-range filtering
* Attribute filtering
* Message search
* Cursor-based pagination
* Time-based aggregation
* Grouping by service or level
* Automatic log retention
* Health monitoring
* Dockerized application and database

## API

| Method | Endpoint          | Description                   |
| ------ | ----------------- | ----------------------------- |
| GET    | `/health`         | Check service health          |
| POST   | `/logs`           | Insert a batch of logs        |
| GET    | `/logs`           | Query stored logs             |
| GET    | `/logs/aggregate` | Aggregate logs by time bucket |

## Log Format

```json
{
  "timestamp": "2026-08-14T12:00:00Z",
  "level": "info",
  "service": "api",
  "message": "request completed",
  "attributes": {
    "status": 200,
    "user": "layan"
  }
}
```

## Testing

The project was tested using unit tests, API endpoint tests, database queries, Docker health checks, TypeScript type checking, and production build verification.

### Unit Tests

All unit tests passed successfully.

```text
> log-ingestion-service@1.0.0 test
> tsx --test tests/*.test.ts

▶ Log validation
  ✔ accepts a valid log (3.285029ms)
  ✔ rejects an invalid log level (0.759539ms)
  ✔ rejects an empty service (0.309327ms)
  ✔ rejects an empty message (0.183024ms)
  ✔ rejects nested attributes (0.380276ms)
  ✔ rejects array attributes (0.27857ms)
  ✔ rejects timestamps more than five minutes in the future (0.175147ms)
  ✔ accepts a current timestamp (0.139794ms)
✔ Log validation (6.544389ms)

▶ Query parsing
  ✔ uses default limit of 100 (0.452498ms)
  ✔ accepts service and level filters (0.208424ms)
  ✔ accepts attribute filters (0.623271ms)
  ✔ rejects an invalid level (0.187756ms)
  ✔ rejects a limit greater than 1000 (0.103621ms)
  ✔ rejects a non-numeric limit (0.143549ms)
  ✔ rejects an invalid time range (0.071508ms)
✔ Query parsing (2.003575ms)

▶ Aggregation query parsing
  ✔ accepts a 1m bucket (0.154496ms)
  ✔ accepts group_by service (0.066534ms)
  ✔ accepts group_by level (0.06182ms)
  ✔ rejects an invalid bucket (0.085996ms)
  ✔ requires since (0.084417ms)
  ✔ requires until (0.070383ms)
  ✔ rejects an invalid group_by value (0.06694ms)
✔ Aggregation query parsing (0.709102ms)

ℹ tests 22
ℹ suites 3
ℹ pass 22
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3493.980515
```

**Result: 22/22 tests passed.**

### TypeScript Type Check

```text
> log-ingestion-service@1.0.0 typecheck
> tsc --noEmit
```

Type checking completed successfully with no errors.

### Production Build

```text
> log-ingestion-service@1.0.0 build
> tsc
```

Production build completed successfully with no errors.

## API Test Results

### Aggregation by Service

```http
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
```

```json
{
  "buckets": [
    {
      "start": "2026-08-19T05:30:00.000Z",
      "group": "checkout",
      "count": 4
    },
    {
      "start": "2026-08-19T05:31:00.000Z",
      "group": "auth",
      "count": 4
    },
    {
      "start": "2026-08-19T05:32:00.000Z",
      "group": "checkout",
      "count": 4
    },
    {
      "start": "2026-08-19T05:35:00.000Z",
      "group": "auth",
      "count": 3
    }
  ]
}
```

### Aggregation by Level

```http
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
```

```json
{
  "buckets": [
    {
      "start": "2026-08-19T05:30:00.000Z",
      "group": "error",
      "count": 4
    },
    {
      "start": "2026-08-19T05:31:00.000Z",
      "group": "info",
      "count": 4
    },
    {
      "start": "2026-08-19T05:32:00.000Z",
      "group": "warn",
      "count": 4
    },
    {
      "start": "2026-08-19T05:35:00.000Z",
      "group": "info",
      "count": 3
    }
  ]
}
```

### Aggregation with Service Filter

```http
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
```

```json
{
  "buckets": [
    {
      "start": "2026-08-19T05:30:00.000Z",
      "group": null,
      "count": 4
    },
    {
      "start": "2026-08-19T05:32:00.000Z",
      "group": null,
      "count": 4
    }
  ]
}
```

### Aggregation with Level Filter

```http
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
```

```json
{
  "buckets": [
    {
      "start": "2026-08-19T05:30:00.000Z",
      "group": null,
      "count": 4
    }
  ]
}
```

### Aggregation with Attribute Filter

```http
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
```

```json
{
  "buckets": [
    {
      "start": "2026-08-19T05:30:00.000Z",
      "group": null,
      "count": 4
    },
    {
      "start": "2026-08-19T05:32:00.000Z",
      "group": null,
      "count": 4
    }
  ]
}
```

### Aggregation with Message Filter

```http
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
```

```json
{
  "buckets": [
    {
      "start": "2026-08-19T05:30:00.000Z",
      "group": null,
      "count": 4
    },
    {
      "start": "2026-08-19T05:32:00.000Z",
      "group": null,
      "count": 4
    }
  ]
}
```

## Aggregation Validation Tests

### Missing `since`

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "error": "since is required"
}
```

### Missing `until`

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "error": "until is required"
}
```

### Missing `bucket`

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "error": "bucket must be one of: 1m, 5m, 1h, 1d"
}
```

### Invalid Bucket

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "error": "bucket must be one of: 1m, 5m, 1h, 1d"
}
```

### Invalid `group_by`

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "error": "group_by must be service or level"
}
```

### Invalid Time Range

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "error": "until must be later than since"
}
```

## Database Results

### Latest Logs

```text
 id |       timestamp        | level | service  |     message
----+------------------------+-------+----------+------------------
 17 | 2026-08-22 18:00:00+00 | error | checkout | payment declined
 21 | 2026-08-19 05:35:00+00 | info  | auth     | successful login
 16 | 2026-08-19 05:35:00+00 | info  | auth     | successful login
  9 | 2026-08-19 05:35:00+00 | info  | auth     | successful login
 20 | 2026-08-19 05:32:00+00 | warn  | checkout | payment retry

(5 rows)
```

### Count by Level

```text
 level | count
-------+-------
 error |     5
 info  |    12
 warn  |     4

(3 rows)
```

### Count by Service

```text
 service  | count
----------+-------
 api      |     5
 auth     |     7
 checkout |     9

(3 rows)
```

### Attributes

```text
 id | service  |                      attributes
----+----------+------------------------------------------------------
 17 | checkout | {"region": "eu-west", "retries": 3, "user_id": "42"}
 21 | auth     | {}
 16 | auth     | {}
  9 | auth     | {}
 20 | checkout | {"retries": 2, "user_id": "42"}

(5 rows)
```

### Database Count

```text
 count
-------
    21

(1 row)
```

The database contains **21 stored logs**.

## Database Indexes

The database uses indexes to improve filtering, sorting, attribute queries, and message searches.

```text
logs_pkey
CREATE UNIQUE INDEX logs_pkey
ON ONLY public.logs
USING btree ("timestamp", id)

idx_logs_timestamp_id
CREATE INDEX idx_logs_timestamp_id
ON ONLY public.logs
USING btree ("timestamp" DESC, id DESC)

idx_logs_service_timestamp
CREATE INDEX idx_logs_service_timestamp
ON ONLY public.logs
USING btree (service, "timestamp" DESC)

idx_logs_level_timestamp
CREATE INDEX idx_logs_level_timestamp
ON ONLY public.logs
USING btree (level, "timestamp" DESC)

idx_logs_attributes
CREATE INDEX idx_logs_attributes
ON ONLY public.logs
USING gin (attributes)

idx_logs_message_trgm
CREATE INDEX idx_logs_message_trgm
ON ONLY public.logs
USING gin (message gin_trgm_ops)
```

## Query Performance

### Filtered Log Query

A query filtering logs by service and ordering by timestamp was tested using `EXPLAIN ANALYZE`.

```text
Planning Time: 12.332 ms
Execution Time: 0.460 ms
```

The query used the service/timestamp indexes on the PostgreSQL partitions.

Example:

```text
Bitmap Index Scan
Index Cond: (service = 'checkout'::text)
```

The query returned **9 rows** with an execution time of approximately **0.46 ms**.

### Aggregation Query

Aggregation performance was also tested using `EXPLAIN ANALYZE`.

```text
GroupAggregate
Group Key: date_trunc('minute', logs."timestamp")

Planning Time: 2.125 ms
Execution Time: 0.106 ms
```

The aggregation query used the timestamp index:

```text
Bitmap Index Scan
Index Cond:
(
  "timestamp" >= '2026-08-19 05:00:00+00'
  AND
  "timestamp" < '2026-08-19 06:00:00+00'
)
```

The aggregation completed in approximately **0.106 ms**.

## Docker

Both the application and PostgreSQL containers were running successfully and reported as healthy.

```text
CONTAINER ID   IMAGE                COMMAND                  STATUS
95cb5a05d8a5   log-serv-app         node dist/server.js      Up 2 minutes (healthy)
c8e5ed1a081d   postgres:16-alpine   postgres                 Up 2 minutes (healthy)
```

### Ports

```text
Application:  localhost:8080 -> container:8080
PostgreSQL:   localhost:5432 -> container:5432
```

## Health Check

The `/health` endpoint returned HTTP 200 successfully.

```http
GET /health

HTTP/1.1 200 OK
```

The application logs also show successful health check requests with very low response times:

```text
responseTime: 0.212 ms
responseTime: 0.319 ms
```

## Application Logs

The application was tested with aggregation, filtering, validation, and health endpoints.

Successful aggregation requests returned HTTP 200:

```text
GET /logs/aggregate?...&bucket=1d
GET /logs/aggregate?...&bucket=1m&group_by=service
GET /logs/aggregate?...&bucket=1m&group_by=level
GET /logs/aggregate?...&bucket=1m&service=checkout
GET /logs/aggregate?...&bucket=1m&level=error
GET /logs/aggregate?...&bucket=1m&attr.user_id=42
GET /logs/aggregate?...&bucket=1m&q=payment
```

Invalid requests correctly returned HTTP 400:

```text
Missing since
Missing until
Missing bucket
Invalid bucket
Invalid group_by
Invalid time range
```

## PostgreSQL Status

PostgreSQL started successfully and became ready to accept connections.

```text
PostgreSQL 16.15
listening on IPv4 address "0.0.0.0", port 5432
listening on IPv6 address "::", port 5432
database system is ready to accept connections
```

The database was successfully restarted and existing data was preserved.

## Test Summary

| Test Result                  | Status  |
| ---------------------------- | ------- |
| Log validation               | PASS    |
| Query parsing                | PASS    |
| Aggregation query parsing    | PASS    |
| API aggregation              | PASS    |
| Service filtering            | PASS    |
| Level filtering              | PASS    |
| Attribute filtering          | PASS    |
| Message filtering            | PASS    |
| Aggregation validation       | PASS    |
| Health endpoint              | PASS    |
| Docker application container | HEALTHY |
| Docker PostgreSQL container  | HEALTHY |
| Database persistence         | PASS    |
| TypeScript type check        | PASS    |
| Production build             | PASS    |
| Database indexing            | PASS    |
| Query performance            | PASS    |
| Aggregation performance      | PASS    |

## Overall Test Result

```text
22 unit tests passed
0 failed
0 skipped
0 cancelled
```

The service successfully passed the implemented validation, query parsing, aggregation, API, database, Docker, type checking, and build tests.

## Author

**Layan Damrah**

Boot.dev TypeScript Final Project — 2026

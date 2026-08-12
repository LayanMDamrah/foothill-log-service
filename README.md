# Log Ingestion and Query Service

A structured log ingestion and query service built with TypeScript, Node.js, Fastify, PostgreSQL, and Docker Compose.

## Features

- Batch log ingestion with validation
- PostgreSQL storage with JSONB attributes
- Filtering by service, level, time, and attributes
- Message search
- Cursor-based pagination
- Log aggregation by time bucket
- Grouping by service or level
- Automatic log retention
- Docker Compose support

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/logs` | Ingest logs |
| GET | `/logs` | Query logs |
| GET | `/logs/aggregate` | Aggregate logs |

## Database

The `logs` table contains:

```text
id, timestamp, level, service, message, attributes, created_at
```

`attributes` uses PostgreSQL `JSONB` for flexible log metadata.

Indexes are used for:

- Timestamp + ID
- Service + timestamp
- Level + timestamp
- JSONB attributes
- Message search

## Pagination

`GET /logs` uses cursor-based pagination with:

```text
timestamp DESC, id DESC
```

## Retention

```env
RETENTION_DAYS=30
RETENTION_BATCH_SIZE=5000
RETENTION_INTERVAL_MS=3600000
```

## Performance

Tested with **100,000 logs**:

```text
Ingestion: 29,223 logs/sec

Aggregation:
p50: 22.63 ms
p95: 66.47 ms
p99: 92.55 ms
```

The aggregation p95 target is **< 1 second**.

## Run

```bash
docker compose up --build
```

API:

```text
http://localhost:8080
```

## Author

**Maha Azzouni**

Boot.dev TypeScript Final Project — 2026
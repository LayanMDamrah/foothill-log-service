# Structured Log Service

A backend service for collecting, storing, searching, and aggregating structured application logs.

Built with TypeScript, Fastify, PostgreSQL, Zod, and Docker Compose.

## Features

- Batch log ingestion
- Per-log validation with partial batch acceptance
- PostgreSQL JSONB attributes
- Time-based PostgreSQL partitioning
- Filtering by service and log level
- Time-range filtering
- Attribute filtering
- Message search
- Cursor-based pagination
- Time-based aggregation
- Grouping by service or level
- Automatic log retention
- Health monitoring
- Dockerized application and database

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check service health |
| POST | `/logs` | Insert a batch of logs |
| GET | `/logs` | Query stored logs |
| GET | `/logs/aggregate` | Aggregate logs by time bucket |

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

## Author

**layan damrah**

Boot.dev TypeScript Final Project — 2026
# Log Ingestion and Query Service

A high-performance structured log ingestion and query service built with TypeScript, Node.js, PostgreSQL, and Docker Compose.

The service accepts structured logs in batches, validates each entry independently, stores logs efficiently in PostgreSQL, supports flexible querying and aggregation, and applies a configurable data-retention policy.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Database Design](#database-design)
- [Attribute Storage Strategy](#attribute-storage-strategy)
- [Index Design](#index-design)
- [Cursor Pagination](#cursor-pagination)
- [Retention Strategy](#retention-strategy)
- [Validation](#validation)
- [Performance Testing](#performance-testing)
- [Query Performance](#query-performance)
- [Testing](#testing)
- [CI](#ci)
- [Security](#security)
- [Known Limitations](#known-limitations)
- [Optional Features](#optional-features)
- [Demo](#demo)
- [Final Verification](#final-verification)

---

# Overview

This project implements a log ingestion and query service similar in concept to a simplified version of systems such as Datadog or Grafana Loki.

The service is designed around three main concerns:

1. **Ingestion**  
   Accept structured logs individually or in batches, validate each entry, and store valid entries efficiently.

2. **Querying**  
   Search logs using multiple combinable filters and retrieve results using cursor-based pagination.

3. **Aggregation**  
   Aggregate logs into time buckets and optionally group them by service or log level.

The system also implements configurable retention so that logs are not stored indefinitely.

PostgreSQL is the source of truth for both reads and writes.

---

# Features

- Batch log ingestion
- Per-entry validation
- Partial batch acceptance
- Invalid-entry rejection with index and reason
- PostgreSQL persistence
- JSONB attributes
- Service filtering
- Level filtering
- Time-range filtering
- Attribute filtering
- Case-insensitive message search
- Cursor-based pagination
- Deterministic timestamp ordering
- Time-bucketed aggregation
- Aggregation grouped by service
- Aggregation grouped by level
- Configurable retention
- Batched deletion of expired logs
- Docker Compose deployment
- Database migrations
- Automated tests
- Performance benchmarks
- Query performance analysis with `EXPLAIN ANALYZE`

---

# Technology Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Database:** PostgreSQL
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Data format:** JSON / JSONB
- **Testing:** Project test suite
- **Development:** `tsx`
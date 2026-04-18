# Production URL Shortener

Distributed, event-driven URL shortener with low-latency redirects and asynchronous analytics.

## Video Demo
- https://drive.google.com/file/d/1Fu2EYi0Xb4mprHdewUMlWERiLUCnu6Ro/view?usp=sharing

## Stack
- Backend: Node.js 22 + Express
- Database: PostgreSQL
- Cache and queue: Redis + Redis Streams
- Worker: Node.js stream consumer with batch UPSERT aggregation
- Frontend: React + Vite + Recharts
- Load testing: k6

## Architecture
- API service handles URL creation, redirect, and analytics read APIs.
- Redirect flow is cache-first for low latency:
  - Redis hit: immediate `302` with `X-Cache-Status: HIT`
  - Redis miss: PostgreSQL lookup, Redis set with TTL, `302` with `X-Cache-Status: MISS`
- Click analytics is decoupled from redirect path:
  - API writes click events to Redis Stream `clicks`
  - Worker consumes with consumer groups and batches events
  - Worker UPSERTs hourly aggregates into PostgreSQL
- Source of truth remains PostgreSQL.

## Directory Layout
- `api` API service
- `worker` analytics worker service
- `db/migrations` SQL bootstrap scripts
- `frontend` minimal React UI
- `load-test/k6` load scripts
- `docker-compose.yml` full orchestration

## Environment
1. Copy `.env.example` to `.env`.
2. Update secrets and deployment-specific values.

Key variables:
- `SNOWFLAKE_NODE_ID` must be unique per API instance in distributed deployments.
- `CORS_ORIGIN` controls which browser origins can call the API.
- `REDIS_CACHE_TTL_SECONDS` controls default redirect cache retention.
- `REDIS_STREAM_NAME` and `REDIS_CONSUMER_GROUP` configure event stream routing.

## Run with Docker
```bash
docker compose up --build -d
```

Check status:
```bash
docker compose ps
docker compose logs api --tail=100
docker compose logs worker --tail=100
docker compose logs frontend --tail=100
```

Frontend URL when running with Docker:
- http://localhost:5173

Backend API URL:
- http://localhost:3000
```

Stop:
```bash
docker compose down
```

If you run frontend via Docker Compose, use:
- http://localhost:5173

## API Endpoints
### Create short URL
`POST /api/shorten`

Request body:
```json
{
  "url": "https://example.com/long/path",
  "strategy": "hash",
  "expires_at": "2026-12-31T23:59:59.000Z"
}
```

Response:
```json
{
  "short_url": "http://localhost:3000/abc12345"
}
```

### Redirect
`GET /:shortCode`
- Returns `302`
- Sets `X-Cache-Status: HIT` or `MISS`
- Returns `404` for missing or expired links

### Analytics
`GET /api/analytics/:shortCode`

Response:
```json
{
  "total_clicks": 123,
  "history": [
    { "hour": "2026-04-18T11:00:00.000Z", "clicks": 21 }
  ]
}
```

## ID Strategies
### Hash strategy
- SHA-256 over URL + salt + timestamp + random UUID
- Base62 encoding
- Collision-safe retry on unique key conflict

### Snowflake-inspired strategy
- `id = (timestamp << 22) | (node_id << 12) | sequence`
- Base62 encoding
- `node_id` sourced from environment for distributed safety

## Frontend
```bash
cd frontend
npm install
npm run dev
```

Required test IDs are implemented:
- `url-input`
- `strategy-select`
- `shorten-button`
- `result-display`
- `analytics-chart`

## Load Testing
```bash
k6 run load-test/k6/shorten.js
k6 run load-test/k6/redirect.js
k6 run load-test/k6/strategy-compare.js
```

## Production Notes
- Use unique `SNOWFLAKE_NODE_ID` per API replica.
- Ensure Redis and PostgreSQL are deployed with persistence and backups.
- Keep API stateless and scale horizontally.
- Keep worker replicas independent with shared consumer group for parallelism.
- Use external observability for logs and metrics.

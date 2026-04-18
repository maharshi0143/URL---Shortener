# Benchmark Report

## Test Setup
- Date: 2026-04-18
- Tool: k6
- Environment: docker-compose (api, worker, db, redis)
- API base URL: http://localhost:3000
- Benchmark profile override: `RATE_LIMIT_MAX=200000` on API container during benchmark runs to avoid rate-limit throttling skewing throughput metrics.
- Scenarios:
  - POST /api/shorten at 50-100 concurrent users
  - GET /:shortCode at 50-100 concurrent users
  - Strategy compare: hash vs snowflake

## How to Run
```bash
k6 run load-test/k6/shorten.js
k6 run load-test/k6/redirect.js
k6 run load-test/k6/strategy-compare.js
```

## Results Summary

| Metric | Shorten | Redirect |
|---|---:|---:|
| RPS | 259.22 | 522.71 |
| Avg Latency (ms) | 15.16 | 5.86 |
| p95 Latency (ms) | 39.44 | 13.43 |
| Error Rate | 0.003% (1/31153) | 0.00% |

### Cache Hit Ratio
- Formula: `cache_hits / (cache_hits + cache_misses)`
- Observed: `62850 / (62850 + 200) = 99.68%`

## Strategy Comparison

| Strategy | RPS | Avg Latency (ms) | p95 Latency (ms) | Collision Count |
|---|---:|---:|---:|---:|
| Hash | ~602.47* | 83.10 | 96.04 | 0 observed |
| Snowflake | ~602.47* | 82.24 | 95.91 | 0 observed |

`*` Strategy-compare run executes two simultaneous 50-VU scenarios. Total measured throughput was 1204.94 req/s, approximately split equally across hash and snowflake scenarios.

## Collision Observations
- Hash strategy collision handling is implemented with retry-on-unique-constraint conflict.
- Snowflake strategy collisions are not expected when `node_id` is unique per node and sequence remains within limits per millisecond.
- During benchmark windows, no unique-constraint collision errors were observed in API logs for either strategy.

## Why Auto-Increment Fails in Distributed Systems
- Auto-increment requires a centralized sequence owner, introducing a single-writer bottleneck.
- Multi-node writes need synchronous coordination to preserve order, increasing latency.
- Sequence state replication and failover are complex and can produce duplicates or gaps.
- Cross-region deployments amplify coordination cost and degrade availability during partitions.
- Distributed-safe IDs (snowflake/hash) avoid central sequence locks and scale horizontally.

## Notes
- A first benchmark attempt with default `RATE_LIMIT_MAX=300` showed severe 429 throttling on `/api/shorten` and was excluded from performance comparison.
- Redirect benchmark naturally reached a very high cache-hit ratio after priming (200 codes) and warm-up.

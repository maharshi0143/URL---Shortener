import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PRIMING_CODES = Number(__ENV.PRIMING_CODES || 200);

const redirectLatency = new Trend('redirect_latency', true);
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

export const options = {
  scenarios: {
    redirect_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '60s', target: 100 },
        { duration: '30s', target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
    redirect_latency: ['avg<120']
  }
};

export function setup() {
  const codes = [];

  for (let i = 0; i < PRIMING_CODES; i += 1) {
    const strategy = i % 2 === 0 ? 'hash' : 'snowflake';
    const createResponse = http.post(
      `${BASE_URL}/api/shorten`,
      JSON.stringify({
        url: `https://example.org/prime/${i}`,
        strategy
      }),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (createResponse.status === 201) {
      const shortUrl = createResponse.json('short_url');
      const code = shortUrl.split('/').pop();
      codes.push(code);
    }
  }

  return { codes };
}

export default function (data) {
  if (!data.codes.length) {
    return;
  }

  const code = data.codes[Math.floor(Math.random() * data.codes.length)];
  const response = http.get(`${BASE_URL}/${code}`, {
    redirects: 0
  });

  redirectLatency.add(response.timings.duration);

  const cacheStatus = response.headers['X-Cache-Status'];
  if (cacheStatus === 'HIT') {
    cacheHits.add(1);
  }

  if (cacheStatus === 'MISS') {
    cacheMisses.add(1);
  }

  check(response, {
    'redirect returns 302': (r) => r.status === 302,
    'cache header present': (r) => ['HIT', 'MISS'].includes(r.headers['X-Cache-Status'])
  });

  sleep(0.1);
}

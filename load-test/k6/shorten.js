import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const shortenLatency = new Trend('shorten_latency', true);

export const options = {
  scenarios: {
    shorten_traffic: {
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
    http_req_duration: ['p(95)<400'],
    shorten_latency: ['avg<250']
  }
};

export default function () {
  const strategy = __ITER % 2 === 0 ? 'hash' : 'snowflake';
  const payload = JSON.stringify({
    url: `https://example.com/resource/${__VU}/${__ITER}`,
    strategy
  });

  const response = http.post(`${BASE_URL}/api/shorten`, payload, {
    headers: {
      'Content-Type': 'application/json'
    },
    tags: {
      strategy
    }
  });

  shortenLatency.add(response.timings.duration, { strategy });

  check(response, {
    'shorten returns 201': (r) => r.status === 201,
    'shorten includes short_url': (r) => {
      try {
        const body = r.json();
        return !!body.short_url;
      } catch (error) {
        return false;
      }
    }
  });

  sleep(0.2);
}

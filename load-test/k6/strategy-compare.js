import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    hash_shorten: {
      executor: 'constant-vus',
      vus: 50,
      duration: '45s',
      exec: 'runHash'
    },
    snowflake_shorten: {
      executor: 'constant-vus',
      vus: 50,
      duration: '45s',
      exec: 'runSnowflake'
    }
  },
  thresholds: {
    'http_req_duration{strategy:hash}': ['p(95)<450'],
    'http_req_duration{strategy:snowflake}': ['p(95)<450'],
    http_req_failed: ['rate<0.01']
  }
};

function createShort(strategy) {
  const response = http.post(
    `${BASE_URL}/api/shorten`,
    JSON.stringify({
      url: `https://compare.example/${strategy}/${__VU}/${__ITER}`,
      strategy
    }),
    {
      headers: {
        'Content-Type': 'application/json'
      },
      tags: {
        strategy
      }
    }
  );

  check(response, {
    [`${strategy} status 201`]: (r) => r.status === 201
  });
}

export function runHash() {
  createShort('hash');
}

export function runSnowflake() {
  createShort('snowflake');
}

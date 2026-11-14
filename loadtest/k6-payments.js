import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const url = 'http://localhost:8083/api/payments';
  const payload = JSON.stringify({
    customerId: '00000000-0000-0000-0000-000000000001',
    sourceAccountId: '00000000-0000-0000-0000-000000000002',
    targetAccountNumber: '100000000002',
    targetIfsc: 'FINC0001234',
    amount: 500.00,
    paymentRail: 'IMPS',
    purpose: 'k6 Performance Benchmark'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + __ENV.AUTH_HEADER || 'Basic dGVsbGVyOlRlbGxlckAxMjM=',
      'Idempotency-Key': 'k6-' + __VU + '-' + __ITER + '-' + Date.now(),
    },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.05);
}

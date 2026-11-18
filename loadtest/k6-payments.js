import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '15s', target: 20 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';
  const url = `${baseUrl}/api/payments`;

  const customerId = __ENV.CUSTOMER_ID || '85b4fa72-8b12-4438-8b92-2c5786fdaccc';
  const sourceAccountId = __ENV.SOURCE_ACCOUNT_ID || 'b0000000-0000-0000-0000-000000000001';
  const targetAccountNumber = __ENV.TARGET_ACCOUNT_NUMBER || '100000000002';
  const authHeader = __ENV.AUTH_HEADER || 'Basic dGVsbGVyOlRlbGxlckAxMjM='; // teller:Teller@123

  const payload = JSON.stringify({
    customerId: customerId,
    sourceAccountId: sourceAccountId,
    targetAccountNumber: targetAccountNumber,
    targetIfsc: 'FINC0001234',
    amount: 10.00,
    paymentRail: 'IMPS',
    purpose: 'k6 Performance Benchmark'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'Idempotency-Key': 'k6-' + __VU + '-' + __ITER + '-' + Date.now(),
    },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.05);
}

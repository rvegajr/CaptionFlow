import { test, expect } from '@playwright/test';

test('health endpoint', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  expect(j.status).toBe('ok');
});

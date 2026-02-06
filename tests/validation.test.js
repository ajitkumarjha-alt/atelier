import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/index.js';

test('POST /api/auth/sync rejects invalid payload', async () => {
  const response = await request(app)
    .post('/api/auth/sync')
    .send({ email: 'not-an-email', fullName: '' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Validation failed');
});

test('POST /api/projects rejects invalid payload', async () => {
  const response = await request(app)
    .post('/api/projects')
    .send({ name: '', buildings: 'oops' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Validation failed');
});

test('PATCH /api/projects/:id rejects non-numeric id', async () => {
  const response = await request(app)
    .patch('/api/projects/abc')
    .send({ name: 'Project', buildings: [] });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Validation failed');
});

test('POST /api/projects/:projectId/site-areas rejects invalid type', async () => {
  const response = await request(app)
    .post('/api/projects/1/site-areas')
    .send({ area_type: 'unknown' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Validation failed');
});

test('PUT /api/site-areas/:id rejects non-numeric id', async () => {
  const response = await request(app)
    .put('/api/site-areas/abc')
    .send({ area_type: 'landscape' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Validation failed');
});

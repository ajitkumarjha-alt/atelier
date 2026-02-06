import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/index.js';
import { query } from '../server/db.js';

const hasDbEnv = Boolean(
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_HOST &&
  process.env.DB_NAME
);
const allowWrite = process.env.TEST_DB_ALLOW_WRITE === 'true';
const shouldSkip = !hasDbEnv || !allowWrite;

const createProjectPayload = (suffix) => ({
  name: `Test Project ${suffix}`,
  location: 'Test Location',
  buildings: [
    {
      name: `Building ${suffix}`,
      applicationType: 'Residential',
      floors: [
        {
          floorNumber: 1,
          floorName: 'Ground',
          flats: [
            {
              type: '1BHK',
              area: 500,
              count: 1
            }
          ]
        }
      ]
    }
  ]
});

const createProject = async (suffix) => {
  const payload = createProjectPayload(suffix);
  const response = await request(app)
    .post('/api/projects')
    .send(payload);

  assert.equal(response.status, 200);
  return response.body.id;
};

const insertDevUser = async (email, fullName) => {
  await query(
    `INSERT INTO users (email, full_name, user_level, is_active)
     VALUES ($1, $2, 'L4', true)
     ON CONFLICT (email) DO NOTHING`,
    [email, fullName]
  );
};

const insertVendorForOtp = async (email, name, companyName, phone) => {
  const columnsResult = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'vendors'`
  );
  const columns = new Set(columnsResult.rows.map(row => row.column_name));

  const insertColumns = ['email'];
  const values = [email];

  if (columns.has('name')) {
    insertColumns.push('name');
    values.push(name);
  }

  if (columns.has('full_name')) {
    insertColumns.push('full_name');
    values.push(name);
  }

  if (columns.has('contact_number')) {
    insertColumns.push('contact_number');
    values.push(phone);
  }

  if (columns.has('phone')) {
    insertColumns.push('phone');
    values.push(phone);
  }

  if (columns.has('company_name')) {
    insertColumns.push('company_name');
    values.push(companyName);
  }

  if (columns.has('is_active')) {
    insertColumns.push('is_active');
    values.push(true);
  }

  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');

  await query(
    `INSERT INTO vendors (${insertColumns.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (email) DO UPDATE SET is_active = true`,
    values
  );
};

const insertConsultantForOtp = async (email, name, companyName, phone) => {
  const columnsResult = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'consultants'`
  );
  const columns = new Set(columnsResult.rows.map(row => row.column_name));

  const insertColumns = ['email'];
  const values = [email];

  if (columns.has('name')) {
    insertColumns.push('name');
    values.push(name);
  }

  if (columns.has('full_name')) {
    insertColumns.push('full_name');
    values.push(name);
  }

  if (columns.has('contact_number')) {
    insertColumns.push('contact_number');
    values.push(phone);
  }

  if (columns.has('phone')) {
    insertColumns.push('phone');
    values.push(phone);
  }

  if (columns.has('company_name')) {
    insertColumns.push('company_name');
    values.push(companyName);
  }

  if (columns.has('is_active')) {
    insertColumns.push('is_active');
    values.push(true);
  }

  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');

  await query(
    `INSERT INTO consultants (${insertColumns.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (email) DO UPDATE SET is_active = true`,
    values
  );
};

test('POST /api/auth/sync returns existing user', { skip: shouldSkip }, async () => {
  const suffix = Date.now();
  const email = `test-user-${suffix}@example.com`;
  const fullName = 'Test User';

  await query(
    `INSERT INTO users (email, full_name, user_level, is_active)
     VALUES ($1, $2, 'L4', true)
     ON CONFLICT (email) DO NOTHING`,
    [email, fullName]
  );

  try {
    const response = await request(app)
      .post('/api/auth/sync')
      .send({ email, fullName });

    assert.equal(response.status, 200);
    assert.equal(response.body.email, email);
    assert.equal(response.body.full_name, fullName);
  } finally {
    await query('DELETE FROM users WHERE email = $1', [email]);
  }
});

test('POST /api/projects creates a project', { skip: shouldSkip }, async () => {
  const suffix = Date.now();
  const payload = createProjectPayload(suffix);

  const response = await request(app)
    .post('/api/projects')
    .send(payload);

  assert.equal(response.status, 200);
  assert.ok(response.body.id);

  await query('DELETE FROM projects WHERE id = $1', [response.body.id]);
});

test('POST /api/projects/:projectId/site-areas creates a site area', { skip: shouldSkip }, async () => {
  const suffix = Date.now();
  const projectId = await createProject(suffix);

  const siteAreaResponse = await request(app)
    .post(`/api/projects/${projectId}/site-areas`)
    .send({
      area_type: 'landscape',
      name: `Landscape ${suffix}`,
      area_sqm: 100,
      softscape_area_sqm: 50
    });

  assert.equal(siteAreaResponse.status, 201);
  assert.equal(siteAreaResponse.body.project_id, projectId);

  await query('DELETE FROM site_areas WHERE project_id = $1', [projectId]);
  await query('DELETE FROM projects WHERE id = $1', [projectId]);
});

test('POST /api/rfi creates an RFI', { skip: shouldSkip }, async () => {
  const suffix = Date.now();
  const projectId = await createProject(suffix);
  let rfiId = null;

  try {
    const response = await request(app)
      .post('/api/rfi')
      .send({
        projectId,
        projectName: `Project ${suffix}`,
        recordNo: `REC-${suffix}`,
        revision: 'R0',
        dateRaised: '2026-02-06',
        disciplines: ['MEP'],
        rfiSubject: 'Test subject',
        rfiDescription: 'Test description',
        attachmentUrls: [],
        raisedBy: 'Test User',
        raisedByEmail: `user-${suffix}@example.com`,
        projectTeamResponse: [],
        designTeamResponse: []
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.project_id, projectId);
    rfiId = response.body.id;
  } finally {
    if (rfiId) {
      await query('DELETE FROM requests_for_information WHERE id = $1', [rfiId]);
    }
    await query('DELETE FROM projects WHERE id = $1', [projectId]);
  }
});

test('POST /api/mas creates a MAS record', { skip: shouldSkip }, async () => {
  const suffix = Date.now();
  const projectId = await createProject(suffix);
  let masId = null;

  try {
    const response = await request(app)
      .post('/api/mas')
      .send({
        projectId,
        materialName: `Material ${suffix}`,
        materialCategory: 'Plumbing',
        manufacturer: 'Test Manufacturer',
        modelSpecification: 'Spec 1',
        quantity: 10,
        unit: 'pcs',
        submittedByVendor: 'Vendor A',
        vendorEmail: `vendor-${suffix}@example.com`,
        attachmentUrls: []
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.project_id, projectId);
    masId = response.body.id;
  } finally {
    if (masId) {
      await query('DELETE FROM material_approval_sheets WHERE id = $1', [masId]);
    }
    await query('DELETE FROM projects WHERE id = $1', [projectId]);
  }
});

test('Vendor OTP flow issues and verifies OTP', { skip: shouldSkip }, async () => {
  const suffix = Date.now();
  const email = `vendor-${suffix}@example.com`;
  const name = `Vendor ${suffix}`;
  const companyName = 'Vendor Co';
  const phone = '1234567890';

  await insertVendorForOtp(email, name, companyName, phone);

  try {
    const sendResponse = await request(app)
      .post('/api/vendors/send-otp')
      .send({ email });

    assert.equal(sendResponse.status, 200);
    assert.equal(sendResponse.body.success, true);

    const otpResult = await query(
      `SELECT otp
       FROM vendor_otp
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    assert.ok(otpResult.rows[0]?.otp);
    const otp = otpResult.rows[0].otp;

    const verifyResponse = await request(app)
      .post('/api/vendors/verify-otp')
      .send({ email, otp });

    assert.equal(verifyResponse.status, 200);
    assert.equal(verifyResponse.body.success, true);
    assert.ok(verifyResponse.body.vendorId);
  } finally {
    await query('DELETE FROM vendor_otp WHERE email = $1', [email]);
    await query('DELETE FROM vendors WHERE email = $1', [email]);
  }
});

test('Consultant OTP flow issues and verifies OTP', { skip: shouldSkip }, async () => {
  const suffix = Date.now();
  const email = `consultant-${suffix}@example.com`;
  const name = `Consultant ${suffix}`;
  const companyName = 'Consultant Co';
  const phone = '1234567890';

  await insertConsultantForOtp(email, name, companyName, phone);

  try {
    const sendResponse = await request(app)
      .post('/api/consultants/send-otp')
      .send({ email });

    assert.equal(sendResponse.status, 200);
    assert.equal(sendResponse.body.success, true);

    const otpResult = await query(
      `SELECT otp
       FROM consultant_otp
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    assert.ok(otpResult.rows[0]?.otp);
    const otp = otpResult.rows[0].otp;

    const verifyResponse = await request(app)
      .post('/api/consultants/verify-otp')
      .send({ email, otp });

    assert.equal(verifyResponse.status, 200);
    assert.equal(verifyResponse.body.success, true);
    assert.ok(verifyResponse.body.consultantId);
  } finally {
    await query('DELETE FROM consultant_otp WHERE email = $1', [email]);
    await query('DELETE FROM consultants WHERE email = $1', [email]);
  }
});

test('POST /api/change-requests creates a change request', { skip: shouldSkip }, async () => {
  const suffix = Date.now();
  const projectId = await createProject(suffix);
  const email = `dev-user-${suffix}@example.com`;
  const fullName = 'Dev User';
  let changeRequestId = null;

  await insertDevUser(email, fullName);

  try {
    const response = await request(app)
      .post('/api/change-requests')
      .set('x-dev-user-email', email)
      .send({
        projectId,
        changeType: 'Design',
        changeCategory: 'MEP',
        entityType: 'Project',
        entityId: null,
        changeDescription: 'Update change request details',
        justification: 'Testing change request',
        impactAssessment: 'Low impact',
        proposedChanges: { test: true },
        currentData: { test: false },
        priority: 'Low',
        attachmentUrls: []
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.project_id, projectId);
    changeRequestId = response.body.id;
  } finally {
    if (changeRequestId) {
      await query('DELETE FROM project_change_requests WHERE id = $1', [changeRequestId]);
    }
    await query('DELETE FROM projects WHERE id = $1', [projectId]);
    await query('DELETE FROM users WHERE email = $1', [email]);
  }
});

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { spawnSync, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const checks = [];
const ca = fs.readFileSync(path.join(root, '.secrets/tls-cert'));
const dockerArgs = ['--host=unix:///var/run/docker.sock', 'compose'];
function compose(...args) {
  const result = spawnSync('docker', [...dockerArgs, ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0)
    throw new Error(`Docker Compose ${args[0]} failed (exit ${result.status})`);
}
function request(resource, { method = 'GET', body, token, key } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'localhost',
        port: Number(process.env.WEB_PORT || 9444),
        path: resource,
        method,
        ca,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(key ? { 'Idempotency-Key': key } : {}),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
          resolve({ status: res.statusCode, data, headers: res.headers });
        });
      },
    );
    req.setTimeout(10000, () => req.destroy(new Error('HTTPS request timed out')));
    req.on('error', reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}
async function main() {
  compose('up', '-d', '--wait', '--wait-timeout', '90');
  const health = await request('/api/ready');
  assert.equal(health.status, 200);
  checks.push('HTTPS web-to-API readiness with certificate verification');
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.ok(home.data.includes('<div id="root">'));
  assert.match(home.headers['content-security-policy'], /script-src 'self'/);
  checks.push('React production page and CSP');
  const suffix = randomUUID();
  const password = randomBytes(24).toString('hex') + 'Aa1';
  async function register(role, label) {
    const result = await request('/api/auth/register', {
      method: 'POST',
      body: { name: label, role, email: `${label}-${suffix}@example.com`, password },
    });
    assert.equal(result.status, 201);
    return result.data;
  }
  const owner = await register('freelancer', 'maker');
  const client = await register('client', 'client');
  const other = await register('freelancer', 'other');
  const gig = await request('/api/gigs', {
    method: 'POST',
    token: owner.token,
    body: {
      title: 'Containerised marketplace demonstration',
      description: 'A complete listing used to validate secure container deployment.',
      category: 'development',
      priceCents: 100005,
      deliveryDays: 3,
    },
  });
  assert.equal(gig.status, 201);
  const key = randomUUID();
  const confirm = () =>
    request('/api/bookings', {
      method: 'POST',
      token: client.token,
      key,
      body: { gigId: gig.data.gig.id },
    });
  const booking = await confirm();
  assert.equal(booking.status, 201);
  const replay = await confirm();
  assert.equal(replay.status, 200);
  assert.equal(replay.data.booking.id, booking.data.booking.id);
  checks.push('Atomic booking + transaction and idempotent confirmation');
  const insights = await request('/api/financial-insights', { token: owner.token });
  assert.equal(insights.status, 200);
  assert.equal(insights.data.insights.taxCents, 20001);
  assert.equal(insights.data.insights.incomeCents, 100005);
  assert.equal(
    (await request('/api/financial-insights', { token: other.token })).data.insights.incomeCents,
    0,
  );
  assert.equal(
    (await request(`/api/bookings/${booking.data.booking.id}`, { token: other.token })).status,
    404,
  );
  checks.push('Owner-scoped income, 20% tax estimate, and cross-account denial');
  assert.equal(
    (await request('/api/auth/logout', { method: 'POST', token: client.token })).status,
    204,
  );
  assert.equal((await request('/api/auth/me', { token: client.token })).status, 401);
  checks.push('Server-side logout revokes JWT');
  const freshClient = await request('/api/auth/login', {
    method: 'POST',
    body: { email: `client-${suffix}@example.com`, password },
  });
  assert.equal(freshClient.status, 200);
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal(
      (
        await request('/api/auth/login', {
          method: 'POST',
          body: { email: `maker-${suffix}@example.com`, password: 'WrongPassword123' },
        })
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await request('/api/auth/login', {
        method: 'POST',
        body: { email: `maker-${suffix}@example.com`, password },
      })
    ).status,
    401,
  );

  const metricCheck = `const https=require('https'),fs=require('fs'); const ca=fs.readFileSync(process.env.HTTPS_CERT_PATH); const token=fs.readFileSync(process.env.MONITORING_TOKEN_FILE,'utf8').trim(); const run=(authorization)=>new Promise((resolve,reject)=>https.get({hostname:'localhost',port:8443,path:'/metrics',ca,headers:authorization?{Authorization:'Bearer '+token}:{}},r=>{let data='';r.on('data',c=>data+=c);r.on('end',()=>resolve({status:r.statusCode,data}));}).on('error',reject)); (async()=>{const a=await run(false),b=await run(true);if(a.status!==401||b.status!==200||!b.data.includes('hustlehub_security_events_total'))process.exit(1); console.log('Protected metrics: 401 without credential, 200 with credential');})().catch(()=>process.exit(1));`;
  compose('exec', '-T', 'api', 'node', '-e', metricCheck);
  checks.push('Protected metrics with a file-mounted credential');
  for (const service of ['api', 'web']) {
    const id = execFileSync('docker', [...dockerArgs, 'ps', '-q', service], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    const state = execFileSync(
      'docker',
      [
        '--host=unix:///var/run/docker.sock',
        'inspect',
        '--format',
        '{{.Config.User}} {{.HostConfig.ReadonlyRootfs}}',
        id,
      ],
      { encoding: 'utf8' },
    ).trim();
    assert.ok(state.endsWith(' true'));
    assert.ok(!state.startsWith('root '));
    assert.ok(!state.startsWith('0 '));
  }
  checks.push('Both runtime containers use non-root users and read-only root filesystems');
  compose('restart', 'api');
  let restored = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const result = await request(`/api/bookings/${booking.data.booking.id}`, {
        token: freshClient.data.token,
      });
      if (result.status === 200) {
        restored = true;
        break;
      }
    } catch {
      /* Wait for the restarted API, preserving TLS verification. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(restored);
  assert.equal((await request('/api/auth/me', { token: client.token })).status, 401);
  assert.equal(
    (
      await request('/api/auth/login', {
        method: 'POST',
        body: { email: `maker-${suffix}@example.com`, password },
      })
    ).status,
    401,
  );
  checks.push('Bookings, token revocation, and account lockout persist across API process restart');
  console.log(`PASS: ${checks.length} container deployment checks`);
}
main()
  .then(() => save(true))
  .catch((error) => {
    console.error(error.message);
    save(false);
    process.exitCode = 1;
  });
function save(passed) {
  fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'reports/container-smoke.json'),
    JSON.stringify({ passed, checks }, null, 2),
  );
}

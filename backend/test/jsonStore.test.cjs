const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const jsonStore = require('../src/utils/jsonStore');
let dir;
after(async () => {
  if (dir) await fs.rm(dir, { recursive: true, force: true });
});
test('atomic store serializes competing updates, survives rejected operations, and fails closed on corruption', async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hustlehub-store-'));
  const filename = path.join(dir, 'data.json');
  const store = jsonStore(filename, { count: 0 }, (data) => Number.isInteger(data.count));
  await Promise.all(
    Array.from({ length: 30 }, () =>
      store.update(async (data) => {
        await new Promise((resolve) => setImmediate(resolve));
        data.count++;
      }),
    ),
  );
  assert.equal((await store.read()).count, 30);
  await assert.rejects(
    store.update(() => {
      throw new Error('Rejected');
    }),
  );
  await store.update((data) => {
    data.count++;
  });
  assert.equal((await store.read()).count, 31);
  assert.equal((await fs.stat(filename)).mode & 0o777, 0o600);
  await fs.writeFile(filename, '{corrupt');
  await assert.rejects(store.read());
  await assert.rejects(store.update(() => {}));
  assert.equal(await fs.readFile(filename, 'utf8'), '{corrupt');
});

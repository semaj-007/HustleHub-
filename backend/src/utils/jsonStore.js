const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Serialize the entire read-modify-write. Atomic rename prevents partial files.
// This store supports ONE Node process; multiple instances need a transactional DB.
function jsonStore(filename, initial, validate) {
  let queue = Promise.resolve();
  async function load() {
    try {
      const data = JSON.parse(await fs.readFile(filename, 'utf8'));
      if (!validate(data)) throw new Error('Invalid stored data');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return structuredClone(initial);
      throw error; // Fail closed on corruption.
    }
  }
  function locked(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {}); // A rejection must not poison the queue.
    return result;
  }
  return {
    read: () => locked(load),
    update: (operation) =>
      locked(async () => {
        const data = await load();
        const result = await operation(data);
        await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
        const temporary = `${filename}.${randomUUID()}.tmp`;
        try {
          await fs.writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600, flag: 'wx' });
          await fs.rename(temporary, filename);
        } finally {
          await fs.rm(temporary, { force: true });
        }
        return result;
      }),
  };
}
module.exports = jsonStore;


// User repository 
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { randomUUID } = require('crypto');
const config = require('../../config/env');
const logger = require('../../config/logger');

const STORE_PATH = config.userStorePath;

// Simple write queue: chains every write onto the previous one so writes
// never interleave, even though Node's fs calls are async.
let writeQueue = Promise.resolve();

function ensureStoreExists() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), { mode: 0o600 });
    logger.info('Initialised empty user store', { path: STORE_PATH });
  }
}

async function readAll() {
  ensureStoreExists();
  const raw = await fsPromises.readFile(STORE_PATH, 'utf-8');
  try {
    return JSON.parse(raw || '[]');
  } catch (err) {
    logger.error('User store file is corrupted; refusing to guess its contents', {
      path: STORE_PATH,
    });
    throw new Error('User store is unreadable');
  }
}

function writeAll(users) {
  writeQueue = writeQueue.then(() =>
    fsPromises.writeFile(STORE_PATH, JSON.stringify(users, null, 2), { mode: 0o600 })
  );
  return writeQueue;
}

async function findByEmail(email) {
  const users = await readAll();
  const normalised = email.trim().toLowerCase();
  return users.find((u) => u.email === normalised) || null;
}

async function findById(id) {
  const users = await readAll();
  return users.find((u) => u.id === id) || null;
}

/**
 * @param {{ name: string, email: string, passwordHash: string, role: string }} data
 */
async function create(data) {
  const users = await readAll();
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    passwordHash: data.passwordHash,
    role: data.role,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await writeAll(users);
  return user;
}

module.exports = { findByEmail, findById, create };

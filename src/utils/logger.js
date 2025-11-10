const fs = require('fs');
const path = require('path');
const config = require('../config');

// Simple JSON line logger writing to files and stdout.
// Levels: debug, info, warn, error

function createWriteStream(file) {
  const full = path.join(config.logging.dir, file);
  try {
    if (!fs.existsSync(config.logging.dir)) fs.mkdirSync(config.logging.dir, { recursive: true });
  } catch {}
  return fs.createWriteStream(full, { flags: 'a' });
}

const appStream = createWriteStream('app.log');
const errStream = createWriteStream('error.log');
const auditStream = createWriteStream('audit.log');

const levels = ['debug', 'info', 'warn', 'error'];
const levelIndex = levels.indexOf((config.logging.level || 'info').toLowerCase());

function serialize(obj) {
  try { return JSON.stringify(obj); } catch { return String(obj); }
}

function write(stream, record) {
  const line = serialize(record) + '\n';
  try { stream.write(line); } catch {}
}

function baseRecord(level, msg, extra) {
  return {
    ts: new Date().toISOString(),
    level,
    msg,
    ...extra
  };
}

const logger = {
  debug(msg, extra = {}) {
    if (levelIndex <= 0) {
      const rec = baseRecord('debug', msg, extra);
      write(appStream, rec); console.debug(rec);
    }
  },
  info(msg, extra = {}) {
    if (levelIndex <= 1) {
      const rec = baseRecord('info', msg, extra);
      write(appStream, rec); console.log(rec);
    }
  },
  warn(msg, extra = {}) {
    if (levelIndex <= 2) {
      const rec = baseRecord('warn', msg, extra);
      write(appStream, rec); console.warn(rec);
    }
  },
  error(msg, extra = {}) {
    const rec = baseRecord('error', msg, extra);
    write(errStream, rec); console.error(rec);
  },
  audit(event) {
    // event should already be a structured object with action, resource, userId, entityId, before/after
    const rec = { ts: new Date().toISOString(), type: 'audit', ...event };
    write(auditStream, rec);
  }
};

module.exports = logger;


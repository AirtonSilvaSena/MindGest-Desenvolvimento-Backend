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

// Função utilitária para gerar timestamp local no fuso de São Paulo
function localTimestamp() {
  // Formata no padrão ISO-like, mas com o fuso horário local
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }) // formato 2025-11-11 00:31:22
    .replace(' ', 'T'); // vira 2025-11-11T00:31:22
}

function baseRecord(level, msg, extra) {
  return {
    ts: localTimestamp(),
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
    const rec = { ts: localTimestamp(), type: 'audit', ...event };
    write(auditStream, rec);
  }
};

module.exports = logger;

const os = require('os');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Simple in-memory cache with TTL
const cache = new Map();
function withCache(key, ttlMs, fn) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < ttlMs) return Promise.resolve(hit.value);
  return Promise.resolve()
    .then(fn)
    .then((value) => { cache.set(key, { ts: now, value }); return value; });
}

function fileSizeMBSafe(file) {
  try {
    const s = fs.statSync(file);
    return +(s.size / (1024*1024)).toFixed(2);
  } catch { return null; }
}

async function getSummary() {
  const ttl = 15_000; // 15s
  return withCache('server_summary', ttl, async () => {
    const mem = process.memoryUsage();
    const logsDir = config.logging.dir;
    const logs = {
      appMB: fileSizeMBSafe(path.join(logsDir, 'app.log')),
      errorMB: fileSizeMBSafe(path.join(logsDir, 'error.log')),
      auditMB: fileSizeMBSafe(path.join(logsDir, 'audit.log')),
    };
    const load = os.loadavg ? os.loadavg() : [0,0,0];
    return {
      uptimeSec: Math.floor(process.uptime()),
      node: { version: process.version, pid: process.pid },
      os: { platform: os.platform(), release: os.release() },
      memory: {
        rssMB: +(mem.rss/(1024*1024)).toFixed(2),
        heapUsedMB: +(mem.heapUsed/(1024*1024)).toFixed(2),
        heapTotalMB: +(mem.heapTotal/(1024*1024)).toFixed(2)
      },
      cpu: { load1: load[0], load5: load[1], load15: load[2] },
      logs
    };
  });
}

module.exports = { getSummary };


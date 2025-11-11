const db = require('../config/db');
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

async function queryOne(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows && rows[0];
}

async function getSchemaSizeMB(dbName) {
  const row = await queryOne(
    `SELECT ROUND(IFNULL(SUM(data_length + index_length)/1024/1024,0),2) AS size_mb
     FROM information_schema.TABLES WHERE table_schema = ?`,
    [dbName]
  );
  return Number(row?.size_mb || 0);
}

async function getTopTables(dbName, limit = 5) {
  const [rows] = await db.query(
    `SELECT table_name, ROUND((data_length + index_length)/1024/1024,2) AS size_mb
     FROM information_schema.TABLES WHERE table_schema = ?
     ORDER BY (data_length + index_length) DESC LIMIT ?`,
    [dbName, Number(limit)]
  );
  return rows.map(r => ({ table: r.table_name, sizeMB: Number(r.size_mb) }));
}

async function getDbStatus() {
  const names = ['Threads_connected', 'Threads_running', 'Slow_queries', 'Uptime'];
  const [rows] = await db.query(
    `SHOW GLOBAL STATUS WHERE Variable_name IN (${names.map(()=>'?').join(',')})`, names
  );
  const out = {};
  for (const r of rows) out[r.Variable_name] = Number(r.Value || 0);
  return out;
}

async function pingLatency() {
  const start = Date.now();
  await queryOne('SELECT 1');
  return Date.now() - start;
}

async function getSummary() {
  const ttl = 15_000; // 15s
  return withCache('db_summary', ttl, async () => {
    const dbName = config.db.name;
    const [sizeMB, topTables, status, latencyMs] = await Promise.all([
      getSchemaSizeMB(dbName),
      getTopTables(dbName, 5),
      getDbStatus(),
      pingLatency()
    ]);
    return {
      database: { name: dbName, host: config.db.host, port: config.db.port },
      sizeMB,
      topTables,
      status,
      latencyMs,
      pool: { limit: config.db.connectionLimit }
    };
  });
}

module.exports = { getSchemaSizeMB, getTopTables, getDbStatus, pingLatency, getSummary };


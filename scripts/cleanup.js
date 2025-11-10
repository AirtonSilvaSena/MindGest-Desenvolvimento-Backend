// Remove todos os usuários admin (uso em ambientes de teste)
const db = require('../src/config/db');

async function run() {
  try {
    const [rows] = await db.query("SELECT id, email FROM usuarios WHERE tipo = 'admin'");
    if (!rows.length) {
      console.log(JSON.stringify({ ok: true, removed: 0 }));
      process.exit(0);
      return;
    }
    const ids = rows.map(r => r.id);
    const [res] = await db.query(`DELETE FROM usuarios WHERE id IN (${ids.map(()=>'?').join(',')})`, ids);
    console.log(JSON.stringify({ ok: true, removed: res.affectedRows, ids }));
    process.exit(0);
  } catch (e) {
    console.error('cleanup_failed', e.message);
    process.exit(1);
  }
}

run();


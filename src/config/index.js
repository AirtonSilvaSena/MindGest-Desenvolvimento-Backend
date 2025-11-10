const fs = require('fs');
const path = require('path');

require('dotenv').config();

function bool(val, def = false) {
  if (val === undefined) return def;
  return /^(1|true|yes|on)$/i.test(String(val));
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim()),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    issuer: process.env.JWT_ISSUER || undefined,
    audience: process.env.JWT_AUDIENCE || undefined,
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    name: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    sslEnabled: bool(process.env.DB_SSL_ENABLED, false),
    sslCAPath: process.env.DB_SSL_CA_PATH || path.join(__dirname, 'ca.pem')
  },
  logging: {
    dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
    level: process.env.LOG_LEVEL || 'info'
  },
  mail: {
    enabled: bool(process.env.MAIL_ENABLED, false),
    service: process.env.MAIL_SERVICE || 'gmail',
    host: process.env.MAIL_HOST || undefined,
    port: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined,
    secure: bool(process.env.MAIL_SECURE, false),
    user: process.env.MAIL_USER || undefined,
    pass: process.env.MAIL_PASS || undefined,
    from: process.env.MAIL_FROM || undefined
  }
};

// Ensure log directory exists
try {
  if (!fs.existsSync(config.logging.dir)) {
    fs.mkdirSync(config.logging.dir, { recursive: true });
  }
} catch {}

module.exports = config;

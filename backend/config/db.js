const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const env = require('./env');

fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });

const db = new DatabaseSync(env.dbPath);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

/**
 * `CREATE TABLE IF NOT EXISTS` in schema.sql only covers brand-new databases —
 * an existing one needs its columns added explicitly. Kept as simple ad hoc
 * migrations rather than a full migration framework, since schema changes to
 * an already-deployed table are rare here.
 */
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('users', 'roll_number', 'TEXT');
ensureColumn('users', 'branch', 'TEXT');

module.exports = db;

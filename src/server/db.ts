import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";

function loadEnvFile() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
    return;
  }
}

let pool: Pool | null = null;

function getPool() {
  if (pool) return pool;
  loadEnvFile();
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE ?? "money_tracker",
    waitForConnections: true,
    connectionLimit: 10,
  });
  return pool;
}

export async function query<T = unknown>(
  sql: string,
  values?: unknown[],
): Promise<T> {
  const [rows] = await getPool().query(sql, values);
  return rows as T;
}

export async function getConnection() {
  return getPool().getConnection();
}

export async function ping(): Promise<boolean> {
  await query("SELECT 1");
  return true;
}

export { getPool as pool };

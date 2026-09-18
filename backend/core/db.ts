import mysql, { type Pool } from "mysql2/promise";
import { loadEnvFile } from "@backend/core/env";

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

export async function query<T = unknown>(sql: string, values?: unknown[]): Promise<T> {
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

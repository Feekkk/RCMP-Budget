import mysql from "mysql";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? " ",
  database: process.env.MYSQL_DATABASE ?? " ",
});

export function query<T = unknown>(sql: string, values?: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (error, results) => {
      if (error) reject(error);
      else resolve(results as T);
    });
  });
}

export function getConnection(): Promise<mysql.PoolConnection> {
  return new Promise((resolve, reject) => {
    pool.getConnection((error, connection) => {
      if (error) reject(error);
      else resolve(connection);
    });
  });
}

export async function ping(): Promise<boolean> {
  await query("SELECT 1");
  return true;
}

export { pool };

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

type MailEnv = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  webUrl: string;
};

export type SendMailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
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
}

function readMailEnv(): MailEnv {
  loadEnvFile();
  return {
    host: process.env.SMTP_HOST ?? "127.0.0.1",
    port: Number(process.env.SMTP_PORT ?? 1025),
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASS?.trim() || undefined,
    from: process.env.SMTP_FROM ?? "Budget Tracker <noreply@budget-buddy.local>",
    webUrl: process.env.MAILPIT_WEB_URL ?? "http://127.0.0.1:8025",
  };
}

let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const env = readMailEnv();
  transporter = nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: false,
    auth: env.user && env.pass ? { user: env.user, pass: env.pass } : undefined,
  });
  return transporter;
}

export function getMailpitWebUrl() {
  return readMailEnv().webUrl;
}

export async function sendMail(input: SendMailInput) {
  const env = readMailEnv();
  const transport = getTransporter();
  await transport.sendMail({
    from: env.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
  });
}

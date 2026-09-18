import { createHash, randomBytes } from "node:crypto";
import { getAuthSession } from "@backend/core/session";
import type { AuthUser, RoleName } from "@/lib/auth";

type UserRow = {
  user_id: number;
  staff_id: number | null;
  email: string;
  oid: string | null;
  department_id: number | null;
  department: string | null;
  designation: string | null;
  role_id: number;
  role_name: string;
};

type MicrosoftProfile = {
  oid: string;
  email: string;
};

const USER_SELECT = `SELECT u.user_id, u.staff_id, u.email, u.oid, u.department_id,
       d.department_name AS department, u.designation, u.role_id, r.role_name
FROM users u
INNER JOIN roles r ON r.role_id = u.role_id
LEFT JOIN departments d ON d.department_id = u.department_id`;

function toAuthUser(row: UserRow): AuthUser {
  return {
    userId: row.user_id,
    staffId: row.staff_id,
    email: row.email,
    departmentId: row.department_id,
    department: row.department,
    designation: row.designation,
    roleId: row.role_id,
    roleName: row.role_name as RoleName,
  };
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("Microsoft sign-in isn't set up yet. Use your staff ID or ask an admin.");
  }
  return value;
}

function getMicrosoftConfig() {
  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || "organizations";
  const clientId = requiredEnv("MICROSOFT_CLIENT_ID");
  const clientSecret = requiredEnv("MICROSOFT_CLIENT_SECRET");
  const appUrl = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI?.trim() || `${appUrl}/auth/microsoft/callback`;
  return {
    tenant,
    clientId,
    clientSecret,
    redirectUri,
    authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
  };
}

function randomUrlToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

async function fetchMicrosoftProfile(
  tokenUrl: string,
  body: URLSearchParams,
): Promise<MicrosoftProfile> {
  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error("Microsoft sign-in failed. Please try again.");
  }

  const claims = tokenJson.id_token ? decodeJwtPayload(tokenJson.id_token) : null;
  let oid = asString(claims?.oid);
  let email = asString(claims?.email) || asString(claims?.preferred_username) || asString(claims?.upn);

  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (meRes.ok) {
    const me = (await meRes.json()) as {
      id?: string;
      mail?: string | null;
      userPrincipalName?: string | null;
    };
    oid = asString(me.id) || oid;
    email = asString(me.mail) || asString(me.userPrincipalName) || email;
  }

  if (!oid || !email) {
    throw new Error("Microsoft did not return your account details. Try again.");
  }

  return { oid, email };
}

export async function startMicrosoftSso() {
  const config = getMicrosoftConfig();
  const state = randomUrlToken();
  const verifier = randomUrlToken();
  const session = await getAuthSession();
  await session.update({
    user: session.data.user,
    msOAuth: { state, verifier },
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: "openid profile email User.Read",
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });

  return { url: `${config.authorizeUrl}?${params.toString()}` };
}

export async function completeMicrosoftSso(input: { code: string; state: string }) {
  const session = await getAuthSession();
  const pending = session.data.msOAuth;
  if (!pending || pending.state !== input.state) {
    throw new Error("This sign-in link expired. Start again from the login page.");
  }

  const config = getMicrosoftConfig();
  const profile = await fetchMicrosoftProfile(
    config.tokenUrl,
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: config.redirectUri,
      code_verifier: pending.verifier,
    }),
  );

  const { query } = await import("@backend/core/db");
  const rows = await query<UserRow[]>(
    `${USER_SELECT} WHERE LOWER(u.email) = LOWER(?) LIMIT 1`,
    [profile.email],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("This email is not allowed to sign in. Ask an admin to add it first.");
  }
  if (row.oid && row.oid !== profile.oid) {
    throw new Error("This Microsoft account doesn't match your staff record. Contact support.");
  }

  await query(
    "UPDATE users SET oid = ?, last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
    [profile.oid, row.user_id],
  );

  const user = toAuthUser(row);
  await session.update({ user, msOAuth: undefined });
  return user;
}

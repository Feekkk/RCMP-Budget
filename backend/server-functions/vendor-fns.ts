import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { ResultSetHeader } from "mysql2";
import { roleMiddleware } from "@backend/core/middleware";

const procumentOnly = roleMiddleware("Procument");
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export type VendorListItem = {
  id: number;
  name: string;
  category: string;
  contact: string;
  email: string;
  phone: string;
};

export type DepartmentOption = {
  id: number;
  name: string;
};

export type VendorInviteDetails = {
  email: string;
  expiresAt: string;
  departments: DepartmentOption[];
};

type VendorRow = {
  vendor_id: number;
  vendor_name: string;
  category: string;
  contact_name: string;
  email: string;
  phone: string;
};

type InviteRow = {
  invite_id: number;
  token: string;
  email: string;
  expires_at: Date | string;
  used_at: Date | string | null;
};

type DepartmentRow = {
  department_id: number;
  department_name: string;
};

const emailSchema = z.string().trim().email();

function parseInviteExpiry(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  return date;
}

function formatInviteExpiry(value: Date) {
  return value.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveAppOrigin(origin?: string) {
  const trimmed = origin?.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  const envOrigin = process.env.APP_URL?.trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  return "http://localhost:3000";
}

function buildInviteUrl(origin: string, token: string) {
  return `${origin}/vendor-invite?token=${encodeURIComponent(token)}`;
}

async function sendVendorInviteEmail(input: {
  to: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const { sendMail } = await import("@backend/core/mail");
  const expiryLabel = formatInviteExpiry(input.expiresAt);

  await sendMail({
    to: input.to,
    subject: "Complete your vendor registration",
    text: [
      `Dear Vendor Partner,`,
      ``,
      `We would like to inform you that you have been invited to register as a vendor.`,
      `Procument and Finance Department, Universiti Kuala Lumpur (RCMP).`,
      ``,
      `Please complete your registration using the link below:`,
      `${input.inviteUrl}`,
      ``,
      `Note: This link will expire on ${expiryLabel} (24 hours). After you submit the form, the link will no longer work.`,
      ``,
      `Regards,`,
      `Procument and Finance Department`,
      `Universiti Kuala Lumpur (RCMP)`,
      ``,
      `This is an automated email. Please do not reply.`,
    ].join("\n"),
    html: `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.7; color: #1a1a1a;">
        <p>Dear Vendor Partner,</p>
        <p>
          We would like to inform you that you have been invited to register as a vendor.
          Procument and Finance Department, Universiti Kuala Lumpur (RCMP).
        </p>
        <p style="margin: 18px 0 10px;">
          Please complete your registration using the link below:
        </p>
        <p>
          <a href="${input.inviteUrl}" style="color: #365314; font-weight: 600;">
            Complete vendor registration
          </a>
        </p>
        <p style="font-size: 14px; color: #555;">
          Note: This link will expire on <strong>${expiryLabel}</strong> (24 hours).
          After you submit the form, the link will no longer work.
        </p>
        <p style="font-size: 13px; color: #777;">
          If the button does not work, copy and paste this link into your browser:<br />
          ${input.inviteUrl}
        </p>
        <p style="margin-top: 22px;">
          Regards,<br />
          Procument and Finance Department<br />
          Universiti Kuala Lumpur (RCMP)
        </p>
        <p style="font-size: 12.5px; color: #888;">
          This is an automated email. Please do not reply.
        </p>
      </div>
    `,
  });
}

async function loadActiveInvite(token: string): Promise<InviteRow> {
  const { query } = await import("@backend/core/db");
  const rows = await query<InviteRow[]>(
    `SELECT invite_id, token, email, expires_at, used_at
     FROM vendor_invites
     WHERE token = ?
     LIMIT 1`,
    [token],
  );

  const invite = rows[0];
  if (!invite) {
    throw new Error("This link is not valid. Ask procurement for a new invite.");
  }

  if (invite.used_at) {
    throw new Error("This link has already been used. Ask procurement for a new invite.");
  }

  const expiresAt = parseInviteExpiry(invite.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new Error("This link has expired. Ask procurement for a new invite.");
  }

  return invite;
}

async function listDepartmentOptions(): Promise<DepartmentOption[]> {
  const { query } = await import("@backend/core/db");
  const rows = await query<DepartmentRow[]>(
    `SELECT department_id, department_name
     FROM departments
     ORDER BY department_name ASC`,
  );

  return rows.map((row) => ({
    id: row.department_id,
    name: row.department_name,
  }));
}

export const listVendors = createServerFn({ method: "GET" })
  .middleware([procumentOnly])
  .handler(async (): Promise<VendorListItem[]> => {
    const { query } = await import("@backend/core/db");
    const rows = await query<VendorRow[]>(
      `SELECT vendor_id, vendor_name, category, contact_name, email, phone
       FROM vendors
       ORDER BY vendor_name ASC`,
    );

    return rows.map((row) => ({
      id: row.vendor_id,
      name: row.vendor_name,
      category: row.category,
      contact: row.contact_name,
      email: row.email,
      phone: row.phone,
    }));
  });

export const createVendorInvite = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = z
      .object({
        email: emailSchema,
        origin: z.string().trim().url().optional(),
      })
      .safeParse(input);
    if (!parsed.success) {
      throw new Error("Enter a valid email address.");
    }
    return { email: parsed.data.email.toLowerCase(), origin: parsed.data.origin };
  })
  .middleware([procumentOnly])
  .handler(async ({ data, context }) => {
    const { query } = await import("@backend/core/db");

    const existingVendor = await query<{ vendor_id: number }[]>(
      `SELECT vendor_id FROM vendors WHERE email = ? LIMIT 1`,
      [data.email],
    );
    if (existingVendor[0]) {
      throw new Error("That vendor is already registered. Use a different email.");
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    await query(
      `INSERT INTO vendor_invites (token, email, expires_at, created_by)
       VALUES (?, ?, ?, ?)`,
      [token, data.email, expiresAt, context.user.userId],
    );

    const inviteUrl = buildInviteUrl(resolveAppOrigin(data.origin), token);

    try {
      await sendVendorInviteEmail({
        to: data.email,
        inviteUrl,
        expiresAt,
      });
    } catch {
      throw new Error("Could not send the invite email. Check SMTP settings and try again.");
    }

    return {
      token,
      email: data.email,
      expiresAt: expiresAt.toISOString(),
      inviteUrl,
      emailSent: true,
    };
  });

export const getVendorInviteDetails = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const parsed = z.object({ token: z.string().trim().min(1) }).safeParse(input);
    if (!parsed.success) {
      throw new Error("This link is not valid. Ask procurement for a new invite.");
    }
    return parsed.data;
  })
  .handler(async ({ data }): Promise<VendorInviteDetails> => {
    const invite = await loadActiveInvite(data.token);
    const departments = await listDepartmentOptions();

    return {
      email: invite.email,
      expiresAt: parseInviteExpiry(invite.expires_at).toISOString(),
      departments,
    };
  });

export const submitVendorRegistration = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = z
      .object({
        token: z.string().trim().min(1),
        vendorName: z.string().trim().min(1),
        category: z.string().trim().min(1),
        contactName: z.string().trim().min(1),
        phone: z.string().trim().min(1),
        departmentIds: z.array(z.number().int().positive()).min(1),
      })
      .safeParse(input);

    if (!parsed.success) {
      throw new Error("Fill in all required fields, then try again.");
    }

    return parsed.data;
  })
  .handler(async ({ data }) => {
    const { getConnection } = await import("@backend/core/db");
    const conn = await getConnection();

    try {
      await conn.beginTransaction();

      const [inviteRows] = await conn.query(
        `SELECT invite_id, token, email, expires_at, used_at
         FROM vendor_invites
         WHERE token = ?
         LIMIT 1
         FOR UPDATE`,
        [data.token],
      );

      const invite = (inviteRows as InviteRow[])[0];
      if (!invite) {
        throw new Error("This link is not valid. Ask procurement for a new invite.");
      }

      if (invite.used_at) {
        throw new Error("This link has already been used. Ask procurement for a new invite.");
      }

      const expiresAt = parseInviteExpiry(invite.expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new Error("This link has expired. Ask procurement for a new invite.");
      }

      const [existingVendorRows] = await conn.query(
        `SELECT vendor_id FROM vendors WHERE email = ? LIMIT 1`,
        [invite.email],
      );
      if ((existingVendorRows as Array<{ vendor_id: number }>)[0]) {
        throw new Error("This email is already registered. Ask procurement for help.");
      }

      const uniqueDepartmentIds = [...new Set(data.departmentIds)];
      const [departmentRows] = await conn.query(
        `SELECT department_id
         FROM departments
         WHERE department_id IN (?)`,
        [uniqueDepartmentIds],
      );

      const departmentIdRows = departmentRows as Array<{ department_id: number }>;
      if (departmentIdRows.length !== uniqueDepartmentIds.length) {
        throw new Error("One or more departments are invalid. Refresh and try again.");
      }

      const [vendorResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO vendors (vendor_name, category, contact_name, email, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [data.vendorName, data.category, data.contactName, invite.email, data.phone],
      );

      const vendorId = vendorResult.insertId;
      for (const departmentId of uniqueDepartmentIds) {
        await conn.query(
          `INSERT INTO vendor_departments (vendor_id, department_id)
           VALUES (?, ?)`,
          [vendorId, departmentId],
        );
      }

      await conn.query(
        `UPDATE vendor_invites
         SET used_at = CURRENT_TIMESTAMP
         WHERE invite_id = ?`,
        [invite.invite_id],
      );

      await conn.commit();
      return { vendorId };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  });

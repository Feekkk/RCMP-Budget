import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { AuthUser } from "@/lib/auth";

type SessionUser = {
  user: AuthUser;
};

const APPROVED_HOD_STATUS_ID = 6;
const REJECTED_HOD_STATUS_ID = 7;

const sessionPassword = "budget_tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export type HodQuotationListItem = {
  id: number;
  title: string;
  requester: string;
  amount: number;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
  statusName: string;
};

type HodQuotationRow = {
  quotation_id: number;
  status_name: string;
  created_at: Date | string;
  item_count: number;
  total_amount: string | number;
  first_item: string | null;
  requester_email: string;
};

function mapStatus(statusName: string): HodQuotationListItem["status"] {
  if (statusName.includes("rejected")) return "Rejected";
  if (
    statusName === "approved_hod" ||
    statusName === "approved_ceo" ||
    statusName === "completed"
  ) {
    return "Approved";
  }
  return "Pending";
}

function formatTitle(firstItem: string | null, itemCount: number) {
  if (!firstItem) return "Quotation request";
  if (itemCount <= 1) return firstItem;
  return `${firstItem} + ${itemCount - 1} more`;
}

function requireHod(user: AuthUser | undefined): AuthUser {
  if (!user) {
    throw new Error("Please sign in to review requisitions.");
  }
  if (user.roleName !== "HOD") {
    throw new Error("Only HOD accounts can review requisitions.");
  }
  return user;
}

export const listHodQuotations = createServerFn({ method: "GET" }).handler(
  async (): Promise<HodQuotationListItem[]> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);

    const { query } = await import("@/server/db");
    const params: unknown[] = [];
    let departmentFilter = "";
    if (user.departmentId != null) {
      departmentFilter = "AND u.department_id = ?";
      params.push(user.departmentId);
    }

    const rows = await query<HodQuotationRow[]>(
      `SELECT
         q.quotation_id,
         qs.status_name,
         q.created_at,
         COUNT(qi.quotation_item_id) AS item_count,
         COALESCE(SUM(qi.item_price * qi.item_quantity), 0) AS total_amount,
         (
           SELECT qi2.item_name
           FROM quotations_items qi2
           WHERE qi2.quotation_id = q.quotation_id
           ORDER BY qi2.quotation_item_id ASC
           LIMIT 1
         ) AS first_item,
         u.email AS requester_email
       FROM quotations q
       INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
       INNER JOIN users u ON u.user_id = q.user_id
       LEFT JOIN quotations_items qi ON qi.quotation_id = q.quotation_id
       WHERE 1 = 1
       ${departmentFilter}
       GROUP BY q.quotation_id, qs.status_name, q.created_at, u.email
       ORDER BY q.created_at DESC`,
      params,
    );

    return rows.map((row) => {
      const created =
        row.created_at instanceof Date
          ? row.created_at
          : new Date(row.created_at);
      return {
        id: row.quotation_id,
        title: formatTitle(row.first_item, Number(row.item_count)),
        requester: row.requester_email,
        amount: Number(row.total_amount),
        date: created.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        status: mapStatus(row.status_name),
        statusName: row.status_name,
      };
    });
  },
);

export const reviewHodQuotation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      quotationId: z.number().int().positive(),
      decision: z.enum(["Approved", "Rejected"]),
    }),
  )
  .handler(async ({ data }): Promise<HodQuotationListItem> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);

    const { query } = await import("@/server/db");
    const params: unknown[] = [data.quotationId];
    let departmentFilter = "";
    if (user.departmentId != null) {
      departmentFilter = "AND u.department_id = ?";
      params.push(user.departmentId);
    }

    const rows = await query<HodQuotationRow[]>(
      `SELECT
         q.quotation_id,
         qs.status_name,
         q.created_at,
         COUNT(qi.quotation_item_id) AS item_count,
         COALESCE(SUM(qi.item_price * qi.item_quantity), 0) AS total_amount,
         (
           SELECT qi2.item_name
           FROM quotations_items qi2
           WHERE qi2.quotation_id = q.quotation_id
           ORDER BY qi2.quotation_item_id ASC
           LIMIT 1
         ) AS first_item,
         u.email AS requester_email
       FROM quotations q
       INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
       INNER JOIN users u ON u.user_id = q.user_id
       LEFT JOIN quotations_items qi ON qi.quotation_id = q.quotation_id
       WHERE q.quotation_id = ?
       ${departmentFilter}
       GROUP BY q.quotation_id, qs.status_name, q.created_at, u.email
       LIMIT 1`,
      params,
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Requisition not found. Refresh the list and try again.");
    }

    if (mapStatus(row.status_name) !== "Pending") {
      throw new Error("This requisition was already reviewed.");
    }

    const nextStatusId =
      data.decision === "Approved"
        ? APPROVED_HOD_STATUS_ID
        : REJECTED_HOD_STATUS_ID;

    await query(`UPDATE quotations SET status_id = ? WHERE quotation_id = ?`, [
      nextStatusId,
      data.quotationId,
    ]);

    const created =
      row.created_at instanceof Date
        ? row.created_at
        : new Date(row.created_at);

    return {
      id: row.quotation_id,
      title: formatTitle(row.first_item, Number(row.item_count)),
      requester: row.requester_email,
      amount: Number(row.total_amount),
      date: created.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status: data.decision,
      statusName:
        data.decision === "Approved" ? "approved_hod" : "rejected_hod",
    };
  });

export type HodQuotationDetail = {
  id: number;
  date: string;
  status: HodQuotationListItem["status"];
  statusName: string;
  amount: number;
  requester: string;
  department: string | null;
  designation: string | null;
  items: {
    id: number;
    name: string;
    description: string;
    quantity: number;
    price: number;
  }[];
  attachments: {
    id: number;
    name: string;
    path: string;
  }[];
};

type DetailRow = {
  quotation_id: number;
  status_name: string;
  created_at: Date | string;
  requester_email: string;
  department: string | null;
  designation: string | null;
};

type ItemRow = {
  quotation_item_id: number;
  item_name: string;
  item_description: string;
  item_quantity: number;
  item_price: string | number;
};

type AttachmentRow = {
  attachment_id: number;
  attachment_name: string;
  attachment_path: string;
};

export const getHodQuotation = createServerFn({ method: "GET" })
  .validator(z.object({ quotationId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<HodQuotationDetail> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = requireHod(session.data.user);

    const { query } = await import("@/server/db");
    const params: unknown[] = [data.quotationId];
    let departmentFilter = "";
    if (user.departmentId != null) {
      departmentFilter = "AND u.department_id = ?";
      params.push(user.departmentId);
    }

    const rows = await query<DetailRow[]>(
      `SELECT
         q.quotation_id,
         qs.status_name,
         q.created_at,
         u.email AS requester_email,
         d.department_name AS department,
         u.designation
       FROM quotations q
       INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
       INNER JOIN users u ON u.user_id = q.user_id
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE q.quotation_id = ?
       ${departmentFilter}
       LIMIT 1`,
      params,
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Requisition not found. Refresh the list and try again.");
    }

    const items = await query<ItemRow[]>(
      `SELECT quotation_item_id, item_name, item_description, item_quantity, item_price
       FROM quotations_items
       WHERE quotation_id = ?
       ORDER BY quotation_item_id ASC`,
      [data.quotationId],
    );

    const attachments = await query<AttachmentRow[]>(
      `SELECT attachment_id, attachment_name, attachment_path
       FROM quotations_attachments
       WHERE quotation_id = ?
       ORDER BY attachment_id ASC`,
      [data.quotationId],
    );

    const mappedItems = items.map((item) => ({
      id: item.quotation_item_id,
      name: item.item_name,
      description: item.item_description,
      quantity: item.item_quantity,
      price: Number(item.item_price),
    }));

    const created =
      row.created_at instanceof Date
        ? row.created_at
        : new Date(row.created_at);

    return {
      id: row.quotation_id,
      date: created.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status: mapStatus(row.status_name),
      statusName: row.status_name,
      amount: mappedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      requester: row.requester_email,
      department: row.department,
      designation: row.designation,
      items: mappedItems,
      attachments: attachments.map((file) => ({
        id: file.attachment_id,
        name: file.attachment_name,
        path: file.attachment_path,
      })),
    };
  });

function uploadsRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../uploads");
}

function mimeFromName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/octet-stream";
}

export const getHodQuotationAttachment = createServerFn({ method: "GET" })
  .validator(z.object({ attachmentId: z.number().int().positive() }))
  .handler(
    async ({
      data,
    }): Promise<{ fileName: string; mimeType: string; data: string }> => {
      const session = await useSession<SessionUser>(sessionConfig());
      const user = requireHod(session.data.user);

      const { query } = await import("@/server/db");
      const params: unknown[] = [data.attachmentId];
      let departmentFilter = "";
      if (user.departmentId != null) {
        departmentFilter = "AND u.department_id = ?";
        params.push(user.departmentId);
      }

      const rows = await query<
        {
          attachment_id: number;
          attachment_name: string;
          attachment_path: string;
        }[]
      >(
        `SELECT a.attachment_id, a.attachment_name, a.attachment_path
         FROM quotations_attachments a
         INNER JOIN quotations q ON q.quotation_id = a.quotation_id
         INNER JOIN users u ON u.user_id = q.user_id
         WHERE a.attachment_id = ?
         ${departmentFilter}
         LIMIT 1`,
        params,
      );

      const row = rows[0];
      if (!row) {
        throw new Error("Attachment not found. Refresh and try again.");
      }

      const root = uploadsRoot();
      const relative = row.attachment_path.replace(/^uploads[/\\]/, "");
      const absolute = resolve(root, relative);
      if (!absolute.startsWith(root)) {
        throw new Error("Attachment not found. Refresh and try again.");
      }

      try {
        const bytes = await readFile(absolute);
        return {
          fileName: row.attachment_name,
          mimeType: mimeFromName(row.attachment_name),
          data: bytes.toString("base64"),
        };
      } catch {
        throw new Error("Could not open this file. Ask the requester to re-upload it.");
      }
    },
  );

import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ResultSetHeader } from "mysql2";
import type { AuthUser } from "@/lib/auth";

type SessionUser = {
  user: AuthUser;
};

const SUBMIT_STATUS_ID = 1;

const attachmentSchema = z.object({
  name: z.string().min(1),
  data: z.string().min(1),
  type: z.string().optional(),
});

const itemSchema = z.object({
  name: z.string().trim().min(1),
  details: z.string(),
  quantity: z.number().int().positive(),
  pricePerUnit: z.number().positive(),
  attachment: attachmentSchema.optional(),
});

const sessionPassword = "budget_tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function uploadsRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../uploads");
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const submitQuotation = createServerFn({ method: "POST" })
  .validator(z.object({ items: z.array(itemSchema).min(1) }))
  .handler(async ({ data }) => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to submit a quotation.");
    }

    const { getConnection } = await import("@/server/db");
    const conn = await getConnection();

    try {
      await conn.beginTransaction();

      const [quotationResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO quotations (user_id, status_id) VALUES (?, ?)`,
        [user.userId, SUBMIT_STATUS_ID],
      );
      const quotationId = quotationResult.insertId;

      for (const item of data.items) {
        await conn.query(
          `INSERT INTO quotations_items
            (quotation_id, item_name, item_description, item_quantity, item_price)
           VALUES (?, ?, ?, ?, ?)`,
          [
            quotationId,
            item.name,
            item.details || "",
            item.quantity,
            item.pricePerUnit,
          ],
        );

        if (item.attachment) {
          const dir = join(uploadsRoot(), "quotations", String(quotationId));
          await mkdir(dir, { recursive: true });
          const fileName = `${Date.now()}-${safeFileName(item.attachment.name)}`;
          const absolutePath = join(dir, fileName);
          const relativePath = `uploads/quotations/${quotationId}/${fileName}`;
          await writeFile(absolutePath, Buffer.from(item.attachment.data, "base64"));

          await conn.query(
            `INSERT INTO quotations_attachments
              (quotation_id, attachment_name, attachment_path)
             VALUES (?, ?, ?)`,
            [quotationId, item.attachment.name, relativePath],
          );
        }
      }

      await conn.commit();
      return { quotationId };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  });

export type QuotationListItem = {
  id: number;
  title: string;
  amount: number;
  itemCount: number;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
  statusName: string;
};

type QuotationRow = {
  quotation_id: number;
  status_name: string;
  created_at: Date | string;
  item_count: number;
  total_amount: string | number;
  first_item: string | null;
};

function mapStatus(statusName: string): QuotationListItem["status"] {
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

export const listMyQuotations = createServerFn({ method: "GET" }).handler(
  async (): Promise<QuotationListItem[]> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to view quotations.");
    }

    const { query } = await import("@/server/db");
    const rows = await query<QuotationRow[]>(
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
         ) AS first_item
       FROM quotations q
       INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
       LEFT JOIN quotations_items qi ON qi.quotation_id = q.quotation_id
       WHERE q.user_id = ?
       GROUP BY q.quotation_id, qs.status_name, q.created_at
       ORDER BY q.created_at DESC`,
      [user.userId],
    );

    return rows.map((row) => {
      const created =
        row.created_at instanceof Date
          ? row.created_at
          : new Date(row.created_at);
      return {
        id: row.quotation_id,
        title: formatTitle(row.first_item, Number(row.item_count)),
        amount: Number(row.total_amount),
        itemCount: Number(row.item_count),
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
export type QuotationDetail = {
  id: number;
  date: string;
  status: QuotationListItem["status"];
  statusName: string;
  amount: number;
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

export const getMyQuotation = createServerFn({ method: "GET" })
  .validator(z.object({ quotationId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<QuotationDetail> => {
    const session = await useSession<SessionUser>(sessionConfig());
    const user = session.data.user;
    if (!user) {
      throw new Error("Please sign in to view quotations.");
    }

    const { query } = await import("@/server/db");
    const rows = await query<DetailRow[]>(
      `SELECT q.quotation_id, qs.status_name, q.created_at
       FROM quotations q
       INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
       WHERE q.quotation_id = ? AND q.user_id = ?
       LIMIT 1`,
      [data.quotationId, user.userId],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Quotation not found.");
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
      items: mappedItems,
      attachments: attachments.map((file) => ({
        id: file.attachment_id,
        name: file.attachment_name,
        path: file.attachment_path,
      })),
    };
  });

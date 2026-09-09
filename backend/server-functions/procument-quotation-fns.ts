import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { roleMiddleware } from "@backend/core/middleware";

const SUBMIT_QUOTATION_STATUS_ID = 1;
const procumentOnly = roleMiddleware("Procument");

export type ProcumentQuotationListItem = {
  id: number;
  title: string;
  department: string;
  requester: string;
  amount: number;
  itemCount: number;
  date: string;
};

export type ProcumentQuotationDetail = {
  id: number;
  date: string;
  statusName: string;
  amount: number;
  requester: string;
  department: string;
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
  }[];
};

type ListRow = {
  quotation_id: number;
  created_at: Date | string;
  item_count: number;
  total_amount: string | number;
  first_item: string | null;
  requester_email: string;
  department_name: string | null;
};

type DetailRow = {
  quotation_id: number;
  status_name: string;
  created_at: Date | string;
  requester_email: string;
  department_name: string | null;
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
};

function formatTitle(firstItem: string | null, itemCount: number) {
  if (!firstItem) return "Quotation request";
  if (itemCount <= 1) return firstItem;
  return `${firstItem} + ${itemCount - 1} more`;
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0) || 0;
}

function formatDate(value: Date | string) {
  const created = value instanceof Date ? value : new Date(value);
  return created.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const listSubmittedQuotations = createServerFn({ method: "GET" })
  .middleware([procumentOnly])
  .handler(async (): Promise<ProcumentQuotationListItem[]> => {
    const { query } = await import("@backend/core/db");
    const rows = await query<ListRow[]>(
      `SELECT
         q.quotation_id,
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
         u.email AS requester_email,
         d.department_name
       FROM quotations q
       INNER JOIN users u ON u.user_id = q.user_id
       LEFT JOIN departments d ON d.department_id = u.department_id
       LEFT JOIN quotations_items qi ON qi.quotation_id = q.quotation_id
       WHERE q.status_id = ?
       GROUP BY q.quotation_id, q.created_at, u.email, d.department_name
       ORDER BY q.created_at DESC`,
      [SUBMIT_QUOTATION_STATUS_ID],
    );

    return rows.map((row) => ({
      id: row.quotation_id,
      title: formatTitle(row.first_item, toNumber(row.item_count)),
      department: row.department_name ?? "No department",
      requester: row.requester_email,
      amount: toNumber(row.total_amount),
      itemCount: toNumber(row.item_count),
      date: formatDate(row.created_at),
    }));
  });

export const getProcumentQuotation = createServerFn({ method: "GET" })
  .validator(z.object({ quotationId: z.number().int().positive() }))
  .middleware([procumentOnly])
  .handler(async ({ data }): Promise<ProcumentQuotationDetail> => {
    const { query } = await import("@backend/core/db");
    const rows = await query<DetailRow[]>(
      `SELECT
         q.quotation_id,
         qs.status_name,
         q.created_at,
         u.email AS requester_email,
         d.department_name,
         u.designation
       FROM quotations q
       INNER JOIN quotation_statuses qs ON qs.status_id = q.status_id
       INNER JOIN users u ON u.user_id = q.user_id
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE q.quotation_id = ? AND q.status_id = ?
       LIMIT 1`,
      [data.quotationId, SUBMIT_QUOTATION_STATUS_ID],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Quotation not found. Refresh the list and try again.");
    }

    const items = await query<ItemRow[]>(
      `SELECT quotation_item_id, item_name, item_description, item_quantity, item_price
       FROM quotations_items
       WHERE quotation_id = ?
       ORDER BY quotation_item_id ASC`,
      [data.quotationId],
    );

    const attachments = await query<AttachmentRow[]>(
      `SELECT attachment_id, attachment_name
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

    return {
      id: row.quotation_id,
      date: formatDate(row.created_at),
      statusName: row.status_name,
      amount: mappedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      requester: row.requester_email,
      department: row.department_name ?? "No department",
      designation: row.designation,
      items: mappedItems,
      attachments: attachments.map((file) => ({
        id: file.attachment_id,
        name: file.attachment_name,
      })),
    };
  });

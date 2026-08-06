import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import type { AuthUser } from "@/lib/auth";

type SessionUser = {
  user: AuthUser;
};

export type CalendarEventKind = "quotation" | "budget";

export type CalendarEventStatus = "Pending" | "Approved" | "Rejected";

export type DepartmentCalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  detail: string;
  requester: string;
  amount: number;
  status: CalendarEventStatus;
  statusName: string;
  createdAt: string;
};

type QuotationRow = {
  quotation_id: number;
  status_name: string;
  created_at: Date | string;
  item_count: number;
  total_amount: string | number;
  first_item: string | null;
  requester_email: string;
};

type BudgetRow = {
  budget_id: number;
  budget_year: number;
  budget_type: string;
  code: string;
  activity: string | null;
  item_name: string | null;
  target_months: string | null;
  budget_amount: string | number;
  status_name: string;
  created_at: Date | string;
  requester_email: string;
};

const sessionPassword = "budget_tracker-dev-session-secret-32";

function sessionConfig() {
  return {
    password: sessionPassword,
    name: "budget_tracker",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function mapStatus(statusName: string): CalendarEventStatus {
  if (statusName.includes("rejected")) return "Rejected";
  if (
    statusName.includes("approved") ||
    statusName === "completed"
  ) {
    return "Approved";
  }
  return "Pending";
}

function quotationTitle(firstItem: string | null, itemCount: number) {
  if (!firstItem) return "Quotation request";
  if (itemCount <= 1) return firstItem;
  return `${firstItem} + ${itemCount - 1} more`;
}

function budgetTitle(row: Pick<BudgetRow, "budget_type" | "activity" | "item_name">) {
  if (row.budget_type === "CAPEX") {
    return row.item_name?.trim() || "Capital expenditure";
  }
  return row.activity?.trim() || "Operating expenditure";
}

function toIso(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function eventDateFromBudget(row: BudgetRow) {
  if (row.target_months && /^\d{4}-\d{2}$/.test(row.target_months)) {
    const [year, month] = row.target_months.split("-").map(Number);
    return new Date(year, month - 1, 1).toISOString();
  }
  return toIso(row.created_at);
}

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export const listDepartmentCalendarEvents = createServerFn({
  method: "GET",
}).handler(async (): Promise<DepartmentCalendarEvent[]> => {
  const session = await useSession<SessionUser>(sessionConfig());
  const user = session.data.user;
  if (!user) {
    throw new Error("Please sign in to view the calendar.");
  }

  const { query } = await import("@/server/db");
  const params: unknown[] = [];
  let departmentFilter = "";

  if (user.department) {
    departmentFilter = "AND u.department = ?";
    params.push(user.department);
  } else {
    departmentFilter = "AND u.user_id = ?";
    params.push(user.userId);
  }

  const quotationRows = await query<QuotationRow[]>(
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

  const budgetRows = await query<BudgetRow[]>(
    `SELECT
       yb.budget_id,
       yb.budget_year,
       yb.budget_type,
       yb.code,
       yb.activity,
       yb.item_name,
       yb.target_months,
       yb.budget_amount,
       qs.status_name,
       yb.created_at,
       u.email AS requester_email
     FROM yearly_budgets yb
     INNER JOIN quotation_statuses qs ON qs.status_id = yb.status_id
     INNER JOIN users u ON u.user_id = yb.created_by
     WHERE 1 = 1
     ${departmentFilter}
     ORDER BY yb.created_at DESC, yb.budget_id DESC`,
    params,
  );

  const quotationEvents: DepartmentCalendarEvent[] = quotationRows.map(
    (row) => {
      const amount = Number(row.total_amount);
      const status = mapStatus(row.status_name);
      const title = quotationTitle(row.first_item, Number(row.item_count));
      return {
        id: `qt-${row.quotation_id}`,
        kind: "quotation",
        title: `QT-${row.quotation_id} · ${title}`,
        detail: `${status} · ${formatRm(amount)} · ${row.requester_email}`,
        requester: row.requester_email,
        amount,
        status,
        statusName: row.status_name,
        createdAt: toIso(row.created_at),
      };
    },
  );

  const budgetEvents: DepartmentCalendarEvent[] = budgetRows.map((row) => {
    const amount = Number(row.budget_amount);
    const status = mapStatus(row.status_name);
    const title = budgetTitle(row);
    const targetHint = row.target_months
      ? ` · Target ${row.target_months}`
      : "";
    return {
      id: `yb-${row.budget_id}`,
      kind: "budget",
      title: `YB-${row.budget_id} · ${row.budget_type} · ${title}`,
      detail: `${status} · ${formatRm(amount)} · ${row.requester_email}${targetHint}`,
      requester: row.requester_email,
      amount,
      status,
      statusName: row.status_name,
      createdAt: eventDateFromBudget(row),
    };
  });

  return [...quotationEvents, ...budgetEvents].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
});

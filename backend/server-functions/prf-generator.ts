import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { Borders, Fill, Worksheet } from "exceljs";
import { authMiddleware } from "@backend/core/middleware";

type FormRow = {
  quotation_id: number;
  created_at: Date | string;
  email: string;
  department: string | null;
  designation: string | null;
};

type ItemRow = {
  item_name: string;
  item_description: string;
  item_quantity: number;
  item_price: string | number;
};

const thin: Partial<Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const greyFill: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};

const MIN_ITEM_ROWS = 12;
const LAST_COL = 8;

function borderRange(ws: Worksheet, startRow: number, endRow: number) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 1; c <= LAST_COL; c++) {
      ws.getRow(r).getCell(c).border = thin;
    }
  }
}

function sectionHeader(ws: Worksheet, row: number, text: string) {
  ws.mergeCells(row, 1, row, LAST_COL);
  const cell = ws.getRow(row).getCell(1);
  cell.value = text;
  cell.font = { bold: true, size: 10 };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = greyFill;
  borderRange(ws, row, row);
}

function labelValue(ws: Worksheet, row: number, col: number, label: string, value = "") {
  const labelCell = ws.getRow(row).getCell(col);
  labelCell.value = `${label} :`;
  labelCell.font = { bold: true, size: 9 };
  const valueCell = ws.getRow(row).getCell(col + 1);
  valueCell.value = value;
  valueCell.font = { size: 9 };
  valueCell.border = { bottom: { style: "thin" } };
}

export type PurchaseRequisitionFormat = "xlsx" | "pdf";

type PdfContext = {
  prNumber: string;
  prDate: string;
  email: string;
  designation: string;
  department: string;
  items: ItemRow[];
  logo: Buffer;
};

async function buildPdfDocument(ctx: PdfContext) {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 30 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolveBuffer) =>
    doc.on("end", () => resolveBuffer(Buffer.concat(chunks))),
  );

  const left = 30;
  const width = doc.page.width - 60;
  const grey = "#d9d9d9";
  let y = 30;

  const box = (x: number, boxY: number, w: number, h: number, fill?: string) => {
    if (fill) {
      doc.save().rect(x, boxY, w, h).fillAndStroke(fill, "#000").restore();
    } else {
      doc.rect(x, boxY, w, h).stroke("#000");
    }
  };

  const write = (
    value: string,
    x: number,
    textY: number,
    w: number,
    opts: {
      bold?: boolean;
      size?: number;
      align?: "left" | "center" | "right";
      italic?: boolean;
    } = {},
  ) => {
    doc
      .font(opts.bold ? "Helvetica-Bold" : opts.italic ? "Helvetica-Oblique" : "Helvetica")
      .fontSize(opts.size ?? 8)
      .fillColor("#000")
      .text(value, x, textY, { width: w, align: opts.align ?? "left" });
  };

  const banner = (label: string) => {
    box(left, y, width, 16, grey);
    write(label, left, y + 4, width, { bold: true, size: 9, align: "center" });
    y += 16;
  };

  doc.image(ctx.logo, left + 2, y, { width: 42, height: 42 });
  box(left + width - 130, y, 130, 16);
  write("UniKL RCMP/WI/PROC/F-01-03", left + width - 130, y + 4, 130, {
    bold: true,
    size: 7,
    align: "center",
  });
  write("P.C.M. SDN. BHD. (477486-U)", left + 50, y + 6, width - 190, {
    bold: true,
    size: 10,
    align: "center",
  });
  write("UNIVERSITI KUALA LUMPUR ROYAL COLLEGE OF MEDICINE PERAK", left + 50, y + 22, width - 190, {
    bold: true,
    size: 9,
    align: "center",
  });
  y += 48;

  banner("PURCHASE REQUISITION FORM");
  y += 6;

  const labelLine = (label: string, value: string, x: number, w: number, lineY: number) => {
    write(`${label} :`, x, lineY, 110, { bold: true });
    write(value, x + 112, lineY, w - 112);
    doc
      .moveTo(x + 112, lineY + 10)
      .lineTo(x + w, lineY + 10)
      .stroke("#000");
  };
  labelLine("Name", ctx.email, left, 300, y);
  labelLine("P.R No.", ctx.prNumber, left + 330, width - 330, y);
  y += 16;
  labelLine("Designation", ctx.designation, left, 300, y);
  labelLine("P.R Date", ctx.prDate, left + 330, width - 330, y);
  y += 16;
  labelLine("Department / Programme", ctx.department, left, 300, y);
  y += 22;

  const itemCols = [28, 247, 40, 40, 90, 90];
  const colX = (index: number) => left + itemCols.slice(0, index).reduce((sum, w) => sum + w, 0);
  const itemHeaders = [
    "No.",
    "Item and specifications\n(Please attached detailed specifications)",
    "Qty",
    "UOM",
    "Est. Unit Cost\n(RM)",
    "Est. Total Cost\n(RM)",
  ];
  const headerHeight = 24;
  itemHeaders.forEach((header, i) => {
    box(colX(i), y, itemCols[i], headerHeight, grey);
    write(header, colX(i) + 2, y + 5, itemCols[i] - 4, {
      bold: true,
      size: 7,
      align: "center",
    });
  });
  y += headerHeight;

  const rowCount = Math.max(ctx.items.length, MIN_ITEM_ROWS);
  const rowHeight = 18;
  let grandTotal = 0;
  const money = (value: number) =>
    value.toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  for (let i = 0; i < rowCount; i++) {
    itemCols.forEach((w, c) => box(colX(c), y, w, rowHeight));
    const item = ctx.items[i];
    if (item) {
      const unit = Number(item.item_price);
      const total = unit * item.item_quantity;
      grandTotal += total;
      write(String(i + 1), colX(0), y + 5, itemCols[0], { align: "center" });
      write(
        item.item_description ? `${item.item_name} - ${item.item_description}` : item.item_name,
        colX(1) + 3,
        y + 5,
        itemCols[1] - 6,
      );
      write(String(item.item_quantity), colX(2), y + 5, itemCols[2], {
        align: "center",
      });
      write("Unit", colX(3), y + 5, itemCols[3], { align: "center" });
      write(money(unit), colX(4), y + 5, itemCols[4] - 4, { align: "right" });
      write(money(total), colX(5), y + 5, itemCols[5] - 4, { align: "right" });
    }
    y += rowHeight;
  }

  box(left, y, width - itemCols[5], rowHeight);
  box(colX(5), y, itemCols[5], rowHeight);
  write("Grand Total (RM)", left, y + 5, width - itemCols[5], {
    bold: true,
    align: "center",
  });
  write(money(grandTotal), colX(5), y + 5, itemCols[5] - 4, {
    bold: true,
    align: "right",
  });
  y += rowHeight;

  box(left, y, width, 30);
  write("Justification :", left + 3, y + 4, width - 6, { bold: true });
  y += 36;

  banner("BUDGET ALLOCATION");
  const budgetCols = [70, 75, 80, 80, 80, 75, 75];
  const budgetHeaders = [
    "Account\nCode",
    "Department\nCode",
    "Source of\nFinancing",
    "Budged\nApproved\n(RM)",
    "Committed\nto date\n(RM)",
    "Amount\nRequired\n(RM)",
    "Budget\nBalance\n(RM)",
  ];
  const budgetX = (index: number) =>
    left + budgetCols.slice(0, index).reduce((sum, w) => sum + w, 0);
  budgetHeaders.forEach((header, i) => {
    box(budgetX(i), y, budgetCols[i], 30, grey);
    write(header, budgetX(i) + 2, y + 4, budgetCols[i] - 4, {
      bold: true,
      size: 7,
      align: "center",
    });
  });
  y += 30;
  for (let r = 0; r < 2; r++) {
    budgetCols.forEach((w, i) => box(budgetX(i), y, w, rowHeight));
    if (r === 0) {
      write(money(grandTotal), budgetX(5), y + 5, budgetCols[5] - 4, {
        align: "right",
      });
    }
    y += rowHeight;
  }
  y += 8;

  const signWidth = width / 3;
  const signTitles = ["Requested by :", "Recommended by :", "Approved by :"];
  const signHeight = 90;
  signTitles.forEach((title, i) => {
    const x = left + signWidth * i;
    box(x, y, signWidth, signHeight);
    write(title, x + 4, y + 4, signWidth - 8, { bold: true });
    const lines =
      i === 0
        ? [`Name : ${ctx.email}`, `Designation : ${ctx.designation}`, `Date : ${ctx.prDate}`]
        : ["Name :", "Designation :", "Date :"];
    lines.forEach((line, l) => write(line, x + 4, y + 44 + l * 14, signWidth - 8));
  });
  y += signHeight;

  banner("APPROVAL LIMIT");
  const approvals: [string, string][] = [
    ["Head of Dept. or higher", "Up to RM50,000.00"],
    ["Dean/ Head of Corporate Division", "Up to RM200,000.00"],
    ["Chief Executive Officer", "Above RM200,000.00"],
  ];
  approvals.forEach(([title, limit], i) => {
    const x = left + signWidth * i;
    box(x, y, signWidth, 28);
    write(title, x + 2, y + 4, signWidth - 4, { bold: true, align: "center" });
    write(limit, x + 2, y + 16, signWidth - 4, { align: "center" });
  });
  y += 28;

  box(left, y, width, 14);
  write(
    "* Please refer to Finance Circular on Authorised Signatories for Administration Documents",
    left + 3,
    y + 4,
    width - 6,
    { italic: true, size: 7 },
  );
  y += 14;

  banner("FOR PROCUREMENT UNIT USE");
  const halfWidth = width / 2;
  box(left, y, halfWidth, 14);
  box(left + halfWidth, y, halfWidth, 14);
  write("RECEIVED BY :", left, y + 4, halfWidth, { bold: true, align: "center" });
  write("COMMENT", left + halfWidth, y + 4, halfWidth, {
    bold: true,
    align: "center",
  });
  y += 14;
  const procurementLabels = ["Sign", "Name", "Designation", "Date"];
  box(left + halfWidth, y, halfWidth, procurementLabels.length * 16);
  procurementLabels.forEach((label) => {
    box(left, y, halfWidth, 16);
    write(`${label} :`, left + 4, y + 5, halfWidth - 8, { bold: true });
    y += 16;
  });

  doc.end();
  return done;
}

export const generatePurchaseRequisition = createServerFn({ method: "POST" })
  .validator(
    z.object({
      quotationId: z.number().int().positive(),
      format: z.enum(["xlsx", "pdf"]).default("xlsx"),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { user } = context;

    const { query } = await import("@backend/core/db");
    const rows = await query<FormRow[]>(
      `SELECT q.quotation_id, q.created_at, u.email, d.department_name AS department, u.designation
       FROM quotations q
       INNER JOIN users u ON u.user_id = q.user_id
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE q.quotation_id = ? AND q.user_id = ?
       LIMIT 1`,
      [data.quotationId, user.userId],
    );
    const form = rows[0];
    if (!form) {
      throw new Error("Quotation not found.");
    }

    const items = await query<ItemRow[]>(
      `SELECT item_name, item_description, item_quantity, item_price
       FROM quotations_items
       WHERE quotation_id = ?
       ORDER BY quotation_item_id ASC`,
      [data.quotationId],
    );

    const created = form.created_at instanceof Date ? form.created_at : new Date(form.created_at);
    const prNumber = `PR-${String(form.quotation_id).padStart(5, "0")}`;
    const prDate = created.toLocaleDateString("en-GB");
    const logo = await readFile(resolve(process.cwd(), "public/unikl.png"));

    if (data.format === "pdf") {
      const pdfBuffer = await buildPdfDocument({
        prNumber,
        prDate,
        email: form.email,
        designation: form.designation ?? "",
        department: form.department ?? "",
        items,
        logo,
      });
      return {
        fileName: `${prNumber}-purchase-requisition.pdf`,
        data: pdfBuffer.toString("base64"),
      };
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Purchase Requisition", {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
    });

    ws.columns = [
      { width: 6 },
      { width: 26 },
      { width: 20 },
      { width: 7 },
      { width: 8 },
      { width: 14 },
      { width: 13 },
      { width: 13 },
    ];

    const logoId = workbook.addImage({
      base64: logo.toString("base64"),
      extension: "png",
    });
    ws.addImage(logoId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 55, height: 55 },
    });

    ws.getRow(1).height = 22;
    ws.getRow(2).height = 22;

    ws.mergeCells("G1:H1");
    const refCell = ws.getCell("G1");
    refCell.value = "UniKL RCMP/WI/PROC/F-01-03";
    refCell.font = { bold: true, size: 8 };
    refCell.alignment = { horizontal: "center", vertical: "middle" };
    refCell.border = thin;
    ws.getCell("H1").border = thin;

    ws.mergeCells("B1:F1");
    const company = ws.getCell("B1");
    company.value = "P.C.M. SDN. BHD. (477486-U)";
    company.font = { bold: true, size: 10 };
    company.alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells("B2:F2");
    const college = ws.getCell("B2");
    college.value = "UNIVERSITI KUALA LUMPUR ROYAL COLLEGE OF MEDICINE PERAK";
    college.font = { bold: true, size: 10 };
    college.alignment = { horizontal: "center", vertical: "middle" };

    sectionHeader(ws, 4, "PURCHASE REQUISITION FORM");

    labelValue(ws, 5, 1, "Name", form.email);
    labelValue(ws, 6, 1, "Designation", form.designation ?? "");
    labelValue(ws, 7, 1, "Department / Programme", form.department ?? "");
    labelValue(ws, 5, 6, "P.R No.", prNumber);
    labelValue(ws, 6, 6, "P.R Date", prDate);

    const headerRow = 9;
    ws.getRow(headerRow).height = 28;
    ws.mergeCells(headerRow, 2, headerRow, 3);
    ws.mergeCells(headerRow, 7, headerRow, 8);
    const itemHeaders: [number, string][] = [
      [1, "No."],
      [2, "Item and specifications\n(Please attached detailed specifications)"],
      [4, "Qty"],
      [5, "UOM"],
      [6, "Est. Unit Cost\n(RM)"],
      [7, "Est. Total Cost\n(RM)"],
    ];
    for (const [col, text] of itemHeaders) {
      const cell = ws.getRow(headerRow).getCell(col);
      cell.value = text;
      cell.font = { bold: true, size: 9 };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.fill = greyFill;
    }
    borderRange(ws, headerRow, headerRow);

    const itemRowCount = Math.max(items.length, MIN_ITEM_ROWS);
    let grandTotal = 0;
    for (let i = 0; i < itemRowCount; i++) {
      const rowIndex = headerRow + 1 + i;
      const row = ws.getRow(rowIndex);
      ws.mergeCells(rowIndex, 2, rowIndex, 3);
      ws.mergeCells(rowIndex, 7, rowIndex, 8);
      const item = items[i];
      if (item) {
        const unit = Number(item.item_price);
        const total = unit * item.item_quantity;
        grandTotal += total;
        row.getCell(1).value = i + 1;
        row.getCell(2).value = item.item_description
          ? `${item.item_name} - ${item.item_description}`
          : item.item_name;
        row.getCell(4).value = item.item_quantity;
        row.getCell(5).value = "Unit";
        row.getCell(6).value = unit;
        row.getCell(7).value = total;
        row.getCell(6).numFmt = "#,##0.00";
        row.getCell(7).numFmt = "#,##0.00";
        row.getCell(2).alignment = { vertical: "top", wrapText: true };
        row.getCell(1).alignment = { horizontal: "center", vertical: "top" };
        row.getCell(4).alignment = { horizontal: "center", vertical: "top" };
        row.getCell(5).alignment = { horizontal: "center", vertical: "top" };
      }
      row.font = { size: 9 };
      borderRange(ws, rowIndex, rowIndex);
    }

    const totalRow = headerRow + 1 + itemRowCount;
    ws.mergeCells(totalRow, 1, totalRow, 6);
    ws.mergeCells(totalRow, 7, totalRow, 8);
    const totalLabel = ws.getRow(totalRow).getCell(1);
    totalLabel.value = "Grand Total (RM)";
    totalLabel.font = { bold: true, size: 9 };
    totalLabel.alignment = { horizontal: "center", vertical: "middle" };
    const totalValue = ws.getRow(totalRow).getCell(7);
    totalValue.value = grandTotal;
    totalValue.numFmt = "#,##0.00";
    totalValue.font = { bold: true, size: 9 };
    totalValue.alignment = { horizontal: "right", vertical: "middle" };
    borderRange(ws, totalRow, totalRow);

    const justificationRow = totalRow + 1;
    ws.mergeCells(justificationRow, 1, justificationRow + 1, LAST_COL);
    const justification = ws.getRow(justificationRow).getCell(1);
    justification.value = {
      richText: [
        { text: "Justification : ", font: { bold: true, size: 9 } },
        { text: "", font: { size: 9 } },
      ],
    };
    justification.alignment = { vertical: "top", wrapText: true };
    borderRange(ws, justificationRow, justificationRow + 1);

    const budgetHeaderRow = justificationRow + 3;
    sectionHeader(ws, budgetHeaderRow, "BUDGET ALLOCATION");

    const budgetColsRow = budgetHeaderRow + 1;
    ws.getRow(budgetColsRow).height = 42;
    ws.mergeCells(budgetColsRow, 4, budgetColsRow, 5);
    const budgetHeaders: [number, string][] = [
      [1, "Account\nCode"],
      [2, "Department\nCode"],
      [3, "Source of\nFinancing"],
      [4, "Budged\nApproved\n(RM)"],
      [6, "Committed\nto date\n(RM)"],
      [7, "Amount\nRequired\n(RM)"],
      [8, "Budget\nBalance\n(RM)"],
    ];
    for (const [col, text] of budgetHeaders) {
      const cell = ws.getRow(budgetColsRow).getCell(col);
      cell.value = text;
      cell.font = { bold: true, size: 9 };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    }
    borderRange(ws, budgetColsRow, budgetColsRow + 2);
    ws.mergeCells(budgetColsRow + 1, 4, budgetColsRow + 1, 5);
    ws.mergeCells(budgetColsRow + 2, 4, budgetColsRow + 2, 5);
    const amountRequired = ws.getRow(budgetColsRow + 1).getCell(7);
    amountRequired.value = grandTotal;
    amountRequired.numFmt = "#,##0.00";
    amountRequired.font = { size: 9 };
    amountRequired.alignment = { horizontal: "right", vertical: "middle" };

    const signTitleRow = budgetColsRow + 4;
    const signBlocks: [number, number, string][] = [
      [1, 2, "Requested by :"],
      [3, 5, "Recommended by :"],
      [6, 8, "Approved by :"],
    ];
    for (const [start, end, title] of signBlocks) {
      ws.mergeCells(signTitleRow, start, signTitleRow, end);
      const cell = ws.getRow(signTitleRow).getCell(start);
      cell.value = title;
      cell.font = { bold: true, size: 9 };
      for (const [offset, label] of [
        [3, "Name :"],
        [4, "Designation :"],
        [5, "Date :"],
      ] as [number, string][]) {
        ws.mergeCells(signTitleRow + offset, start, signTitleRow + offset, end);
        const line = ws.getRow(signTitleRow + offset).getCell(start);
        line.value = label;
        line.font = { size: 9 };
      }
    }
    borderRange(ws, signTitleRow, signTitleRow + 5);
    for (let r = signTitleRow; r <= signTitleRow + 5; r++) {
      for (const c of [3, 6]) {
        ws.getRow(r).getCell(c).border = { ...thin, left: { style: "thin" } };
      }
    }

    const requesterName = ws.getRow(signTitleRow + 3).getCell(1);
    requesterName.value = `Name : ${form.email}`;
    const requesterDesignation = ws.getRow(signTitleRow + 4).getCell(1);
    requesterDesignation.value = `Designation : ${form.designation ?? ""}`;
    const requesterDate = ws.getRow(signTitleRow + 5).getCell(1);
    requesterDate.value = `Date : ${prDate}`;

    const approvalHeaderRow = signTitleRow + 6;
    sectionHeader(ws, approvalHeaderRow, "APPROVAL LIMIT");

    const approvalLimits: [number, number, string, string][] = [
      [1, 2, "Head of Dept. or higher", "Up to RM50,000.00"],
      [3, 5, "Dean/ Head of Corporate Division", "Up to RM200,000.00"],
      [6, 8, "Chief Executive Officer", "Above RM200,000.00"],
    ];
    for (const [start, end, title, limit] of approvalLimits) {
      ws.mergeCells(approvalHeaderRow + 1, start, approvalHeaderRow + 1, end);
      ws.mergeCells(approvalHeaderRow + 2, start, approvalHeaderRow + 2, end);
      const titleCell = ws.getRow(approvalHeaderRow + 1).getCell(start);
      titleCell.value = title;
      titleCell.font = { bold: true, size: 9 };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      const limitCell = ws.getRow(approvalHeaderRow + 2).getCell(start);
      limitCell.value = limit;
      limitCell.font = { size: 9 };
      limitCell.alignment = { horizontal: "center", vertical: "middle" };
    }
    borderRange(ws, approvalHeaderRow + 1, approvalHeaderRow + 2);

    const noteRow = approvalHeaderRow + 3;
    ws.mergeCells(noteRow, 1, noteRow, LAST_COL);
    const note = ws.getRow(noteRow).getCell(1);
    note.value =
      "* Please refer to Finance Circular on Authorised Signatories for Administration Documents";
    note.font = { italic: true, size: 8 };
    borderRange(ws, noteRow, noteRow);

    const procurementRow = noteRow + 1;
    sectionHeader(ws, procurementRow, "FOR PROCUREMENT UNIT USE");

    ws.mergeCells(procurementRow + 1, 1, procurementRow + 1, 4);
    ws.mergeCells(procurementRow + 1, 5, procurementRow + 1, 8);
    const receivedBy = ws.getRow(procurementRow + 1).getCell(1);
    receivedBy.value = "RECEIVED BY :";
    receivedBy.font = { bold: true, size: 9 };
    receivedBy.alignment = { horizontal: "center" };
    const comment = ws.getRow(procurementRow + 1).getCell(5);
    comment.value = "COMMENT";
    comment.font = { bold: true, size: 9 };
    comment.alignment = { horizontal: "center" };

    const procurementLabels = ["Sign", "Name", "Designation", "Date"];
    procurementLabels.forEach((label, i) => {
      const r = procurementRow + 2 + i;
      const cell = ws.getRow(r).getCell(1);
      cell.value = label;
      cell.font = { bold: true, size: 9 };
      ws.getRow(r).getCell(2).value = ":";
      ws.mergeCells(r, 5, r, 8);
    });
    borderRange(ws, procurementRow + 1, procurementRow + 5);

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      fileName: `${prNumber}-purchase-requisition.xlsx`,
      data: Buffer.from(buffer).toString("base64"),
    };
  });

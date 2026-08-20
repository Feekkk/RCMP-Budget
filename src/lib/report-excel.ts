import ExcelJS from "exceljs";
import type { HodBudgetDetail } from "@backend/server-functions/hod-budget-fns";

const UNIVERSITY =
  "UNIVERSITI KUALA LUMPUR ROYAL COLLEGE OF MEDICINE PERAK (UniKL RCMP)";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

type BudgetExcelItem = {
  itemName: string | null;
  quantity: number;
  costPerUnit: number;
  amount: number;
};

export type BudgetExcelSource = HodBudgetDetail;

type BudgetExcelLine = HodBudgetDetail & BudgetExcelItem;

function fill(color: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function headerCell(cell: ExcelJS.Cell, color: string) {
  cell.fill = fill(color);
  cell.font = { bold: true, size: 9 };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = thinBorder;
}

function bodyCell(cell: ExcelJS.Cell) {
  cell.font = { size: 9 };
  cell.alignment = { vertical: "top", wrapText: true };
  cell.border = thinBorder;
}

function formatMonthLabel(value: string | null) {
  if (!value) return "";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function flattenBudgetLines(rows: BudgetExcelSource[]): BudgetExcelLine[] {
  return rows.flatMap((row) => {
    if (row.items && row.items.length > 0) {
      return row.items.map((item) => ({
        ...row,
        itemName: item.itemName,
        quantity: item.quantity,
        costPerUnit: item.costPerUnit,
        amount: item.amount,
      }));
    }

    return [
      {
        ...row,
        itemName: row.itemName,
        quantity: row.quantity ?? 1,
        costPerUnit: row.costPerUnit ?? row.amount,
        amount: row.amount,
      },
    ];
  });
}

async function download(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportCapexExcel(
  rows: BudgetExcelSource[],
  year: number,
  categories: Record<string, string>,
) {
  const lines = flattenBudgetLines(rows);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("CAPEX", {
    views: [{ showGridLines: false }],
  });

  sheet.columns = [
    { width: 5 },
    { width: 14 },
    { width: 30 },
    { width: 35 },
    { width: 14 },
    { width: 10 },
    { width: 14 },
    { width: 14 },
    { width: 24 },
    { width: 24 },
    { width: 14 },
  ];

  sheet.getCell("A1").value = UNIVERSITY;
  sheet.getCell("A1").font = { bold: true, size: 11 };
  sheet.getCell("A2").value =
    `BUDGET PROPOSED FOR CAPITAL EXPENDITURES (CAPEX) FOR YEAR ${year}`;
  sheet.getCell("A2").font = { bold: true, size: 11 };

  sheet.getCell("A4").value = "Department :";
  sheet.getCell("A4").font = { bold: true, size: 10 };
  sheet.getCell("B4").value = lines[0]?.department ?? "";
  sheet.getCell("B4").font = { size: 10 };

  sheet.mergeCells("F6:H6");
  const budgetBanner = sheet.getCell("F6");
  budgetBanner.value = `BUDGET ${year}`;
  headerCell(budgetBanner, "FFFFC000");

  const headers = [
    "No",
    "Code",
    "Item",
    "Justification",
    "TARGET MONTH/S TO SPEND",
    "Quantity",
    "Estimated Cost p/unit",
    "Estimated Price",
    "Effect if Budget Not Approved",
    "Alternative more cost effective alternative",
    "Remarks",
  ];
  const headerColors = [
    "FF92D050",
    "FF92D050",
    "FF92D050",
    "FF92D050",
    "FF92D050",
    "FF92D050",
    "FF92D050",
    "FF92D050",
    "FFDDEBF7",
    "FFE4B5E8",
    "FFF8CBAD",
  ];
  const headerRow = sheet.getRow(7);
  headers.forEach((title, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = title;
    headerCell(cell, headerColors[index]);
  });
  headerRow.height = 28;

  let rowIndex = 8;
  lines.forEach((row, index) => {
    const excelRow = sheet.getRow(rowIndex);
    const values = [
      index + 1,
      categories[row.code] || row.code,
      row.itemName ?? "",
      row.justification,
      formatMonthLabel(row.targetMonths),
      row.quantity,
      row.costPerUnit,
      row.amount,
      row.effectIfNotApproved ?? "",
      row.alternative ?? "",
      row.remarks ?? "",
    ];
    values.forEach((value, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = value;
      bodyCell(cell);
    });
    excelRow.getCell(1).alignment = { horizontal: "center", vertical: "top" };
    excelRow.getCell(6).alignment = { horizontal: "center", vertical: "top" };
    excelRow.getCell(7).numFmt = "#,##0.00";
    excelRow.getCell(8).numFmt = "#,##0.00";
    rowIndex += 1;
  });

  const totalRow = sheet.getRow(rowIndex);
  for (let col = 1; col <= 11; col += 1) {
    totalRow.getCell(col).border = thinBorder;
  }
  totalRow.getCell(7).value = "TOTAL";
  totalRow.getCell(7).font = { bold: true, size: 9 };
  totalRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
  const totalCell = totalRow.getCell(8);
  totalCell.value = lines.reduce((sum, row) => sum + row.amount, 0);
  totalCell.numFmt = "#,##0.00";
  totalCell.font = { bold: true, size: 9 };
  totalCell.border = {
    top: { style: "medium" },
    left: { style: "medium" },
    bottom: { style: "medium" },
    right: { style: "medium" },
  };

  await download(workbook, `CAPEX_Budget_${year}.xlsx`);
}

export async function exportOpexExcel(rows: BudgetExcelSource[], year: number) {
  const lines = flattenBudgetLines(rows);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("OPEX", {
    views: [{ showGridLines: false }],
  });

  sheet.columns = [
    { width: 6 },
    { width: 14 },
    { width: 32 },
    { width: 24 },
    { width: 18 },
    { width: 24 },
    { width: 30 },
    { width: 8 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
  ];

  sheet.mergeCells("A1:K1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = UNIVERSITY;
  titleCell.font = { bold: true, size: 11 };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells("A2:K2");
  const subtitleCell = sheet.getCell("A2");
  subtitleCell.value = `BUDGET PROPOSED FOR OPERATING EXPENDITURES (OPEX) FOR YEAR ${year}`;
  subtitleCell.font = { bold: true, size: 11 };
  subtitleCell.alignment = { horizontal: "center" };

  sheet.getCell("A4").value = "Department :";
  sheet.getCell("A4").font = { bold: true, size: 10 };
  sheet.getCell("B4").value = lines[0]?.department ?? "";
  sheet.getCell("B4").font = { bold: true, size: 10 };
  sheet.getCell("B4").border = { bottom: { style: "thin" } };

  const headers = [
    "NO.",
    "CODE (AutoCount)",
    "ACTIVITIES / PROGRAMME / EVENT",
    "ITEM",
    "TARGET MONTH/S TO SPEND",
    "OBJECTIVES",
    "JUSTIFICATIONS (CALCULATION)",
    "QTY",
    "COST P/UNIT (RM)",
    `OPEX BUDGET (RM)`,
    "REMARKS",
  ];
  const headerRow = sheet.getRow(6);
  headers.forEach((title, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = title;
    headerCell(cell, "FFFFFFFF");
  });
  headerRow.height = 26;

  const grouped = new Map<string, BudgetExcelLine[]>();
  lines.forEach((row) => {
    const list = grouped.get(row.code) ?? [];
    list.push(row);
    grouped.set(row.code, list);
  });

  let rowIndex = 7;
  let itemNumber = 1;
  grouped.forEach((groupRows, code) => {
    let groupTotal = 0;
    groupRows.forEach((row, index) => {
      const excelRow = sheet.getRow(rowIndex);
      const values = [
        itemNumber,
        index === 0 ? code : "",
        row.activity ?? "",
        row.itemName ?? "",
        formatMonthLabel(row.targetMonths),
        row.objective ?? "",
        row.justification,
        row.quantity,
        row.costPerUnit,
        row.amount,
        row.remarks ?? "",
      ];
      values.forEach((value, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = value;
        bodyCell(cell);
      });
      excelRow.getCell(1).alignment = { horizontal: "center", vertical: "top" };
      excelRow.getCell(8).alignment = { horizontal: "center", vertical: "top" };
      excelRow.getCell(9).numFmt = "#,##0.00";
      excelRow.getCell(10).numFmt = "#,##0.00";
      groupTotal += row.amount;
      itemNumber += 1;
      rowIndex += 1;
    });

    const totalRow = sheet.getRow(rowIndex);
    for (let col = 1; col <= 11; col += 1) {
      const cell = totalRow.getCell(col);
      cell.fill = fill("FFFFFF00");
      cell.border = thinBorder;
    }
    const totalLabel = totalRow.getCell(9);
    totalLabel.value = "Total";
    totalLabel.font = { bold: true, size: 9 };
    totalLabel.alignment = { horizontal: "right", vertical: "middle" };
    const totalValue = totalRow.getCell(10);
    totalValue.value = groupTotal;
    totalValue.numFmt = "#,##0.00";
    totalValue.font = { bold: true, size: 9 };
    rowIndex += 1;
  });

  const grandRow = sheet.getRow(rowIndex);
  const grandLabel = grandRow.getCell(9);
  grandLabel.value = `TOTAL BUDGET PROPOSED (OPEX) FOR YEAR`;
  grandLabel.font = { bold: true, size: 9 };
  grandLabel.alignment = { horizontal: "right", vertical: "middle" };
  const grandValue = grandRow.getCell(10);
  grandValue.value = lines.reduce((sum, row) => sum + row.amount, 0);
  grandValue.numFmt = "#,##0.00";
  grandValue.font = { bold: true, size: 9 };
  for (let col = 1; col <= 11; col += 1) {
    grandRow.getCell(col).border = thinBorder;
  }

  await download(workbook, `OPEX_Budget_${year}.xlsx`);
}

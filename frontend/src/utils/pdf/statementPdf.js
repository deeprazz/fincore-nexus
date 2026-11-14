import { jsPDF } from "jspdf";

export function downloadStatementPdf(
  statementData,
  filenamePrefix = "account-statement",
  accountDetails = {}
) {
  if (!statementData) return;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const currency = (value) =>
    `INR ${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const safeText = (value) =>
    String(value ?? "—").replace(/[\u0000-\u001F]/g, " ");
  const generatedAt = new Date();
  const transactions = Array.isArray(statementData.transactions)
    ? statementData.transactions
    : [];
  const fromDate =
    accountDetails.from ||
    statementData.fromDate ||
    statementData.from ||
    "All available";
  const toDate =
    accountDetails.to ||
    statementData.toDate ||
    statementData.to ||
    "Present";

  const drawHeader = (continued = false) => {
    doc.setFillColor(18, 37, 63);
    doc.rect(0, 0, pageWidth, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text("FinCore Nexus", margin, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      continued ? "ACCOUNT STATEMENT · CONTINUED" : "ACCOUNT STATEMENT",
      margin,
      21
    );
    doc.text(
      `Generated ${generatedAt.toLocaleDateString("en-IN")}`,
      pageWidth - margin,
      21,
      { align: "right" }
    );
    doc.setTextColor(30, 41, 59);
  };

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(220, 226, 234);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Computer-generated statement · Please contact your bank for any discrepancy.",
        margin,
        pageHeight - 5
      );
      doc.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 5,
        { align: "right" }
      );
    }
  };

  drawHeader();
  let y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ACCOUNT DETAILS", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 7;
  doc.text(
    `Account: ${safeText(accountDetails.accountNumber || accountDetails.accountId || "Customer account")}`,
    margin,
    y
  );
  doc.text(
    `Statement period: ${safeText(fromDate)} to ${safeText(toDate)}`,
    margin + 95,
    y
  );
  doc.text(`Transactions: ${transactions.length}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 9;
  const cards = [
    ["OPENING BALANCE", statementData.openingBalance],
    ["TOTAL CREDITS", statementData.totalDeposits],
    ["TOTAL DEBITS", statementData.totalWithdrawals],
    ["CLOSING BALANCE", statementData.closingBalance],
  ];
  const cardGap = 4;
  const cardWidth = (pageWidth - margin * 2 - cardGap * 3) / 4;
  cards.forEach(([label, value], index) => {
    const x = margin + index * (cardWidth + cardGap);
    doc.setFillColor(242, 246, 250);
    doc.setDrawColor(225, 231, 238);
    doc.roundedRect(x, y, cardWidth, 19, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(currency(value), x + 4, y + 13.5);
  });

  y += 29;
  const columns = [
    { title: "DATE & TIME", x: margin, width: 43 },
    { title: "REFERENCE", x: margin + 44, width: 44 },
    { title: "DESCRIPTION", x: margin + 89, width: 55 },
    { title: "DEBIT (INR)", x: margin + 145, width: 34, align: "right" },
    { title: "CREDIT (INR)", x: margin + 181, width: 34, align: "right" },
    {
      title: "BALANCE (INR)",
      x: pageWidth - margin - 2,
      width: 37,
      align: "right",
    },
  ];
  const tableLeft = margin;
  const tableRight = pageWidth - margin;
  const drawTableHeader = () => {
    doc.setFillColor(231, 238, 246);
    doc.rect(tableLeft, y - 5, tableRight - tableLeft, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    columns.forEach((col) =>
      doc.text(
        col.title,
        col.x,
        y + 1,
        col.align ? { align: col.align } : {}
      )
    );
    y += 10;
  };
  drawTableHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  transactions.forEach((tx, index) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      drawHeader(true);
      y = 43;
      drawTableHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
    const type = String(tx.transactionType || tx.type || "Transaction")
      .replaceAll("_", " ")
      .toUpperCase();
    const amount = Number(tx.amount ?? 0);
    const isDebit =
      /OUT|WITHDRAW|DEBIT|PAYMENT|TRANSFER/.test(type) &&
      !/INCOMING|CREDIT/.test(type);
    const dateValue =
      tx.createdAt || tx.timestamp || tx.transactionDate || tx.date;
    const dateLabel = dateValue
      ? new Date(dateValue).toLocaleString("en-IN")
      : "—";
    const reference = safeText(
      tx.referenceId || tx.id || tx.transactionId || "—"
    );
    const balance =
      tx.balanceAfter ?? tx.balanceAfterTransaction ?? tx.runningBalance;
    const values = [
      { text: dateLabel, x: columns[0].x },
      {
        text:
          reference.length > 22 ? `${reference.slice(0, 19)}...` : reference,
        x: columns[1].x,
      },
      {
        text: type.length > 28 ? `${type.slice(0, 25)}...` : type,
        x: columns[2].x,
      },
      {
        text: isDebit
          ? amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "—",
        x: columns[3].x,
        align: "right",
      },
      {
        text: !isDebit
          ? amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "—",
        x: columns[4].x,
        align: "right",
      },
      {
        text:
          balance == null
            ? "—"
            : Number(balance).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
        x: columns[5].x,
        align: "right",
      },
    ];
    if (index % 2 === 0) {
      doc.setFillColor(249, 251, 253);
      doc.rect(tableLeft, y - 4, tableRight - tableLeft, 8, "F");
    }
    doc.setTextColor(51, 65, 85);
    values.forEach((value) =>
      doc.text(
        value.text,
        value.x,
        y + 1,
        value.align ? { align: value.align } : {}
      )
    );
    doc.setDrawColor(235, 239, 244);
    doc.line(tableLeft, y + 4, tableRight, y + 4);
    y += 8;
  });

  if (!transactions.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "No transactions were found for this statement period.",
      margin,
      y + 2
    );
  }

  drawFooter();
  const dateStamp = generatedAt.toISOString().slice(0, 10);
  doc.save(`${filenamePrefix}-${dateStamp}.pdf`);
}

export default downloadStatementPdf;

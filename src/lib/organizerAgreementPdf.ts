import type { jsPDF as JsPdfDocument } from "jspdf";

export interface SignedOrganizerAgreementPdfData {
  application_id: string;
  agreement_title: string;
  agreement_version: string;
  agreement_text: string;
  document_hash: string;
  signer_name: string;
  signer_email: string;
  company_name: string;
  signed_at: string;
}

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 18;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - (MARGIN_MM * 2);

function addPageHeader(doc: JsPdfDocument, title: string, version: string) {
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, PAGE_WIDTH_MM, 5, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, MARGIN_MM, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Agreement version ${version}`, MARGIN_MM, 23);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN_MM, 27, PAGE_WIDTH_MM - MARGIN_MM, 27);
}

export async function createOrganizerAgreementPdf(data: SignedOrganizerAgreementPdfData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const bottomLimit = PAGE_HEIGHT_MM - 20;
  let y = 34;

  const newPage = () => {
    doc.addPage();
    addPageHeader(doc, data.agreement_title, data.agreement_version);
    y = 34;
  };

  const ensureSpace = (height: number) => {
    if (y + height > bottomLimit) newPage();
  };

  addPageHeader(doc, data.agreement_title, data.agreement_version);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(MARGIN_MM, y, CONTENT_WIDTH_MM, 30, 2, 2, "FD");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text("ORGANIZER", MARGIN_MM + 5, y + 7);
  doc.text("SIGNED BY", MARGIN_MM + 5, y + 18);
  doc.setFont("helvetica", "normal");
  doc.text(data.company_name, MARGIN_MM + 34, y + 7);
  doc.text(`${data.signer_name} (${data.signer_email})`, MARGIN_MM + 34, y + 18);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Signed ${new Date(data.signed_at).toISOString()}`, MARGIN_MM + 5, y + 26);
  y += 38;

  const sourceLines = data.agreement_text.split("\n");
  for (const rawLine of sourceLines) {
    const line = rawLine.trim();
    if (!line || line === data.agreement_title || line === `Version: ${data.agreement_version}`) {
      if (!line) y += 2;
      continue;
    }

    const isHeading = /^\d+\.\s/.test(line);
    doc.setFont("helvetica", isHeading ? "bold" : "normal");
    doc.setFontSize(isHeading ? 11 : 9.5);
    doc.setTextColor(isHeading ? 15 : 51, isHeading ? 23 : 65, isHeading ? 42 : 85);
    const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH_MM) as string[];
    const lineHeight = isHeading ? 5.4 : 4.7;
    ensureSpace((wrapped.length * lineHeight) + (isHeading ? 21 : 2));
    // A page break redraws the page header, so restore the body style afterwards.
    doc.setFont("helvetica", isHeading ? "bold" : "normal");
    doc.setFontSize(isHeading ? 11 : 9.5);
    doc.setTextColor(isHeading ? 15 : 51, isHeading ? 23 : 65, isHeading ? 42 : 85);
    doc.text(wrapped, MARGIN_MM, y, { lineHeightFactor: 1.25 });
    y += (wrapped.length * lineHeight) + (isHeading ? 3 : 2);
  }

  ensureSpace(48);
  y += 3;
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN_MM, y, CONTENT_WIDTH_MM, 43, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("ELECTRONIC SIGNATURE RECORD", MARGIN_MM + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Signed by: ${data.signer_name}`, MARGIN_MM + 5, y + 15);
  doc.text(`Email: ${data.signer_email}`, MARGIN_MM + 5, y + 21);
  doc.text(`Company: ${data.company_name}`, MARGIN_MM + 5, y + 27);
  doc.text(`Signed at (UTC): ${new Date(data.signed_at).toISOString()}`, MARGIN_MM + 5, y + 33);
  doc.setFontSize(7.5);
  const hashLines = doc.splitTextToSize(`Document SHA-256: ${data.document_hash}`, CONTENT_WIDTH_MM - 10) as string[];
  doc.text(hashLines, MARGIN_MM + 5, y + 39);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN_MM, PAGE_HEIGHT_MM - 14, PAGE_WIDTH_MM - MARGIN_MM, PAGE_HEIGHT_MM - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("GoTogether - Signed Organizer Agreement", MARGIN_MM, PAGE_HEIGHT_MM - 9);
    doc.text(`Page ${page} of ${pageCount}`, PAGE_WIDTH_MM - MARGIN_MM, PAGE_HEIGHT_MM - 9, { align: "right" });
  }

  doc.setProperties({
    title: `${data.agreement_title} - ${data.company_name}`,
    subject: `Signed organizer agreement ${data.agreement_version}`,
    author: "GoTogether",
    creator: "GoTogether Admin Portal",
  });
  return doc;
}

export async function downloadOrganizerAgreementPdf(data: SignedOrganizerAgreementPdfData) {
  const doc = await createOrganizerAgreementPdf(data);
  const safeApplicationId = data.application_id.replace(/[^a-zA-Z0-9_-]/g, "-");
  doc.save(`organizer-agreement-${safeApplicationId}.pdf`);
}

// ─── PDF Generation Helper (client-side) ───────────────────────────
// Uses jsPDF for basic PDF generation. For rich layouts, prefer server-side generation.

import { jsPDF } from 'jspdf';

export interface PDFReportRow {
  name: string;
  email?: string;
  standups: number;
  avgDuration: number;
  lastStandup: string | null;
}

export function generateTeamPDF(title: string, rows: PDFReportRow[]): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFontSize(18);
  doc.text(title, 40, y);
  y += 24;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, y);
  y += 30;

  // Header
  doc.setFillColor(240, 240, 240);
  doc.rect(40, y - 12, pageWidth - 80, 18, 'F');
  doc.setTextColor(30);
  doc.setFontSize(10);
  const headers = ['Name', 'Email', 'Standups', 'Avg Duration', 'Last Standup'];
  const colX = [40, 140, 320, 380, 460];
  headers.forEach((h, i) => doc.text(h, colX[i], y));
  y += 20;

  rows.forEach((r) => {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    doc.setTextColor(50);
    doc.text(r.name, colX[0], y);
    doc.text(r.email ?? '', colX[1], y);
    doc.text(String(r.standups), colX[2], y);
    doc.text(`${Math.round(r.avgDuration / 60)}m`, colX[3], y);
    doc.text(r.lastStandup ? new Date(r.lastStandup).toLocaleDateString() : '—', colX[4], y);
    y += 16;
  });

  return doc;
}

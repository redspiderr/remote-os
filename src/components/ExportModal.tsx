'use client';

import React, { useState } from 'react';

interface ExportModalProps {
  teamId?: string;
  onClose: () => void;
}

export default function ExportModal({ teamId, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = `format=${format}${teamId ? `&teamId=${teamId}` : ''}`;
      const res = await fetch(`/api/admin/reports/export?${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Export failed (${res.status})`);
      }

      if (format === 'csv') {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // PDF returns JSON with data; trigger print for now
        const data = await res.json();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head><title>Team Report</title><style>body{font-family:sans-serif;padding:24px;background:#fff;color:#111;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;}</style></head>
              <body>
                <h1>Team Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <table>
                  <tr><th>Name</th><th>Email</th><th>Standups</th><th>Avg Duration</th></tr>
                  ${data.data.map((row: any) => `<tr><td>${row.name}</td><td>${row.email}</td><td>${row.standups}</td><td>${Math.round(row.avgDuration / 60)}m</td></tr>`).join('')}
                </table>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }

      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#2A6FBB]/20 bg-[#1A1D2E] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-[#F9F7F2] mb-4">Export Report</h3>
        {error && (
          <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
            {error}
          </div>
        )}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setFormat('csv')}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              format === 'csv'
                ? 'border-[#2A6FBB]/40 bg-[#2A6FBB]/10 text-[#F9F7F2]'
                : 'border-[#2A6FBB]/10 text-[#6B7280] hover:text-[#F9F7F2]'
            }`}
          >
            CSV Spreadsheet
          </button>
          <button
            onClick={() => setFormat('pdf')}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              format === 'pdf'
                ? 'border-[#2A6FBB]/40 bg-[#2A6FBB]/10 text-[#F9F7F2]'
                : 'border-[#2A6FBB]/10 text-[#6B7280] hover:text-[#F9F7F2]'
            }`}
          >
            PDF Document
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#2A6FBB]/10 text-sm text-[#6B7280] hover:text-[#F9F7F2] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#2A6FBB] text-white text-sm font-medium hover:bg-[#2A6FBB]/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

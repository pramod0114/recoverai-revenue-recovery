/**
 * Utility functions for exporting data in CSV, JSON, and HTML/PDF Printable formats.
 */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(sanitize).join(','),
    ...rows.map((row) => row.map(sanitize).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportObjectsToCsv(filename: string, data: Record<string, any>[]) {
  if (!data || data.length === 0) {
    exportToCsv(filename, ['Notice'], [['No records available for export']]);
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((item) => headers.map((header) => {
    const val = item[header];
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return val;
  }));

  exportToCsv(filename, headers, rows);
}

export function exportToJson(filename: string, data: any) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

export function exportToPrintableReport(report: {
  title: string;
  subtitle?: string;
  generatedAt?: string;
  kpis?: { label: string; value: string | number }[];
  headers: string[];
  rows: (string | number)[][];
}) {
  const timestamp = report.generatedAt || new Date().toLocaleString();
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // If popup blocked, fallback to CSV export
    exportToCsv(`${report.title.toLowerCase().replace(/\s+/g, '_')}_export.csv`, report.headers, report.rows);
    return;
  }

  const kpisHtml = report.kpis && report.kpis.length > 0
    ? `
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        ${report.kpis.map(k => `
          <div style="flex: 1; padding: 14px; border: 1px solid #E4E7EC; border-radius: 8px; background: #F8F9FA;">
            <div style="font-size: 11px; color: #667085; text-transform: uppercase; font-weight: 600;">${k.label}</div>
            <div style="font-size: 20px; font-weight: bold; color: #101828; margin-top: 4px;">${k.value}</div>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #F2F4F7; text-align: left;">
          ${report.headers.map(h => `<th style="padding: 10px 12px; border: 1px solid #D0D5DD; font-weight: 600; color: #344054;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${report.rows.map((row, idx) => `
          <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
            ${row.map(cell => `<td style="padding: 8px 12px; border: 1px solid #EAECF0; color: #1D2939;">${cell ?? '-'}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${report.title} - RecoverAI Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; color: #101828; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #2563EB; padding-bottom: 12px;">
          <div>
            <h1 style="margin: 0; font-size: 22px; color: #101828;">${report.title}</h1>
            ${report.subtitle ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #475467;">${report.subtitle}</p>` : ''}
          </div>
          <div style="text-align: right; font-size: 11px; color: #667085;">
            <div><strong>RecoverAI Revenue Engine</strong></div>
            <div>Generated: ${timestamp}</div>
          </div>
        </div>

        ${kpisHtml}
        ${tableHtml}

        <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #EAECF0; font-size: 11px; color: #98A2B3; text-align: center;">
          Confidential & Proprietary — RecoverAI Autonomous Revenue Recovery Platform
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

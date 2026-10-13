'use client';

export default function ReportActions({ csv, filename }: { csv: string; filename: string }) {
  function download() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex gap-2 no-print">
      <button className="btn-primary" onClick={download}>
        Download CSV
      </button>
      <button className="btn-ghost" onClick={() => window.print()}>
        Print
      </button>
    </div>
  );
}

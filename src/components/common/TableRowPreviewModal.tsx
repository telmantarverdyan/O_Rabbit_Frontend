import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Database, Table as TableIcon, Download, RefreshCw, Eye, Hash, Copy, Check, HardDrive } from 'lucide-react';
import { useToast } from './Toast';
import { terminalSound } from '@/utils/terminalSound';
import { getTableDetails } from '@/utils/tableCatalog';

export interface TableRowPreviewData {
  tableName: string;
  totalRowsEstimate?: number;
  sizeBytes?: number;
  columns: string[];
  rows: any[][];
}

interface TableRowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  previewData?: TableRowPreviewData;
}

export const TableRowPreviewModal: React.FC<TableRowPreviewModalProps> = ({
  isOpen,
  onClose,
  tableName,
  previewData: customData,
}) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // Derive real schema and sample data dynamically from real catalog
  const catalogEntry = getTableDetails(tableName || 'users');

  const data: TableRowPreviewData = customData || {
    tableName: catalogEntry.name,
    totalRowsEstimate: catalogEntry.rowsEstimate,
    sizeBytes: catalogEntry.sizeBytes,
    columns: catalogEntry.columns.map((c) => c.name),
    rows: catalogEntry.sampleRows,
  };

  const handleCopyJSON = () => {
    const formatted = JSON.stringify(
      data.rows.map((row) =>
        data.columns.reduce((obj: any, col, idx) => {
          obj[col] = row[idx];
          return obj;
        }, {})
      ),
      null,
      2
    );
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    terminalSound.playSuccess();
    toast.success(`Copied ${data.rows.length} sample rows JSON!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const header = data.columns.join(',');
    const rows = data.rows.map((r) => r.join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${header}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data.tableName}_sample_rows.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    terminalSound.playSuccess();
    toast.success('Downloaded CSV sample rows export');
  };

  const sizeMb = data.sizeBytes
    ? data.sizeBytes > 1024 * 1024 * 1024
      ? `${(data.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
      : `${(data.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : '—';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Table Data Preview: ${data.tableName}`}
      subtitle={`Source table telemetry: ${(data.totalRowsEstimate || 0).toLocaleString()} estimated rows • ${sizeMb} raw size`}
      maxWidth="2xl"
    >
      <div className="space-y-4 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-[#020504] border border-surface-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-surface-darker border border-surface-border text-emerald-400">
              <TableIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-100 text-sm">{data.tableName}</span>
              <div className="text-[10px] text-emerald-600">
                Columns: <span className="text-emerald-300 font-bold">{data.columns.length}</span> • Total Rows: <span className="text-cyan-400 font-bold">{(data.totalRowsEstimate || 0).toLocaleString()}</span> • Est Size: <span className="text-emerald-300 font-bold">{sizeMb}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopyJSON}
            >
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
            <Button
              variant="cyber"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Scrollable Data Rows Table */}
        <div className="rounded-xl border border-surface-border bg-surface/90 overflow-hidden shadow-terminal-sm">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#020504] text-emerald-600 border-b border-surface-border text-[10px] uppercase sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-emerald-700 w-12">#</th>
                  {data.columns.map((col, i) => (
                    <th key={i} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40 text-emerald-200">
                {data.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-emerald-950/30 transition">
                    <td className="py-2 px-3 text-[10px] text-emerald-700 font-mono">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                        {typeof cell === 'number' ? (
                          <span className="text-cyan-400 font-semibold">{cell}</span>
                        ) : String(cell).toUpperCase() === 'ACTIVE' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-[#00ff66] border border-emerald-500/40">
                            {cell}
                          </span>
                        ) : String(cell).toUpperCase() === 'PENDING' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40">
                            {cell}
                          </span>
                        ) : (
                          <span className="text-emerald-100">{String(cell)}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-surface-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
};

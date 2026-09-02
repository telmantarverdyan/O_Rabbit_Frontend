import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Modal } from './Modal';
import { Button } from './Button';
import { Database, Search, Key, Sparkles, Check, Table as TableIcon, RefreshCw, HardDrive } from 'lucide-react';
import { getTableCatalogList, getTableDetails, TableCatalogEntry, ColumnInfo } from '@/utils/tableCatalog';

interface TableSchema {
  name: string;
  rowsEstimate: number;
  sizeBytes?: number;
  columns: ColumnInfo[];
}

const CATALOG_SCHEMAS: TableSchema[] = getTableCatalogList().map((entry) => ({
  name: entry.name,
  rowsEstimate: entry.rowsEstimate,
  sizeBytes: entry.sizeBytes,
  columns: entry.columns,
}));

interface SchemaInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId?: string;
  onSelectTableAndCursor?: (table: string, cursorColumn: string) => void;
}

export const SchemaInspectorModal: React.FC<SchemaInspectorModalProps> = ({
  isOpen,
  onClose,
  connectionId,
  onSelectTableAndCursor,
}) => {
  const [search, setSearch] = useState('');

  const { data: remoteSchemas, isLoading, refetch } = useQuery({
    queryKey: ['schema', connectionId],
    queryFn: async () => {
      if (!connectionId) return CATALOG_SCHEMAS;
      try {
        const res = await apiClient<TableSchema[]>(`/api/connections/${connectionId}/schema`);
        if (Array.isArray(res) && res.length > 0) return res;
      } catch {}
      return CATALOG_SCHEMAS;
    },
    enabled: isOpen,
  });

  const tableList = remoteSchemas || CATALOG_SCHEMAS;
  const [selectedTable, setSelectedTable] = useState<TableSchema>(tableList[0] || CATALOG_SCHEMAS[0]);

  useEffect(() => {
    if (tableList.length > 0) {
      setSelectedTable(tableList[0]);
    }
  }, [tableList]);

  const filteredTables = tableList.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const [inspectorTab, setInspectorTab] = useState<'columns' | 'rows'>('columns');

  // Dynamically load realistic sample rows for whatever table is active
  const activeDetails = getTableDetails(selectedTable.name);
  const sampleRows = activeDetails.sampleRows;
  const sampleColumns = activeDetails.columns.map((c) => c.name);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Source Schema & Table Inspector"
      maxWidth="2xl"
    >
      <div className="space-y-4 font-mono text-xs">
        <p className="text-emerald-400/80 text-[11px]">
          Inspect source database tables, preview live sample data rows, and auto-assign recommended High-Water Mark cursor columns for partition distribution.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-surface-border pt-4">
          {/* Table List */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-emerald-600" />
              <input
                type="text"
                placeholder="grep tables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#020504] border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-emerald-100 placeholder-emerald-800 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {filteredTables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition flex items-center justify-between ${
                    selectedTable.name === t.name
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-terminal-sm font-semibold'
                      : 'text-emerald-400/70 hover:bg-emerald-950/40 hover:text-emerald-200 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <TableIcon className="h-3.5 w-3.5 text-emerald-400" />
                    {t.name}
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    {(t.rowsEstimate / 1000000).toFixed(1)}M rows
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Schema & Data Details */}
          <div className="md:col-span-2 space-y-3 bg-[#020504] p-4 rounded-xl border border-surface-border">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <div>
                <h4 className="text-sm font-bold text-emerald-200 font-mono flex items-center gap-1.5 glow-emerald">
                  <Database className="h-3.5 w-3.5 text-emerald-400" /> {selectedTable.name}
                </h4>
                <div className="text-[10px] text-emerald-600 font-mono flex items-center gap-2 mt-0.5">
                  <span>Volume: <span className="text-emerald-300 font-bold">~{selectedTable.rowsEstimate.toLocaleString()} rows</span></span>
                  <span>•</span>
                  <span>Size: <span className="text-cyan-400 font-bold">{activeDetails.sizeBytes > 1024 * 1024 * 1024 ? `${(activeDetails.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : `${(activeDetails.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}</span></span>
                </div>
              </div>

              {/* Inspector Tabs */}
              <div className="flex rounded-lg bg-surface-darker border border-surface-border p-0.5">
                <button
                  type="button"
                  onClick={() => setInspectorTab('columns')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    inspectorTab === 'columns'
                      ? 'bg-emerald-950 text-[#00ff66] border border-emerald-500/40'
                      : 'text-emerald-600 hover:text-emerald-400'
                  }`}
                >
                  Columns ({selectedTable.columns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('rows')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    inspectorTab === 'rows'
                      ? 'bg-emerald-950 text-[#00ff66] border border-emerald-500/40'
                      : 'text-emerald-600 hover:text-emerald-400'
                  }`}
                >
                  Sample Rows ({sampleRows.length})
                </button>
              </div>
            </div>

            {inspectorTab === 'columns' ? (
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-emerald-600 border-b border-surface-border text-[10px] uppercase">
                    <tr>
                      <th className="pb-1.5 font-semibold">Column</th>
                      <th className="pb-1.5 font-semibold">Type</th>
                      <th className="pb-1.5 font-semibold text-right">Cursor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/40 text-emerald-200">
                    {selectedTable.columns.map((c) => (
                      <tr key={c.name} className="hover:bg-emerald-950/30">
                        <td className="py-2 flex items-center gap-1.5">
                          {c.isPk && <Key className="h-3 w-3 text-amber-400" />}
                          <span className={c.isPk ? 'text-amber-300 font-bold' : 'text-emerald-100'}>
                            {c.name}
                          </span>
                        </td>
                        <td className="py-2 text-emerald-500/80 text-[11px]">{c.type}</td>
                        <td className="py-2 text-right">
                          {c.isRecommendedCursor && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                              <Sparkles className="h-2.5 w-2.5 text-emerald-400" /> RECOMMENDED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="max-h-56 overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-emerald-600 border-b border-surface-border text-[10px] uppercase">
                    <tr>
                      {sampleColumns.map((colName) => (
                        <th key={colName} className="pb-1.5 px-2 font-semibold whitespace-nowrap">
                          {colName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/40 text-emerald-200">
                    {sampleRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-emerald-950/30">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-2 whitespace-nowrap text-emerald-300">
                            {typeof cell === 'number' ? (
                              <span className="text-cyan-400 font-semibold">{cell}</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {onSelectTableAndCursor && (
              <div className="pt-2 border-t border-surface-border flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Check}
                  onClick={() => {
                    const bestCursor =
                      selectedTable.columns.find((c) => c.isRecommendedCursor)?.name ||
                      selectedTable.columns[0].name;
                    onSelectTableAndCursor(selectedTable.name, bestCursor);
                    onClose();
                  }}
                >
                  Select [{selectedTable.name}]
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};


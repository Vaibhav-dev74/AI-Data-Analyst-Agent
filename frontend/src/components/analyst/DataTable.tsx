import React, { useState } from 'react';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps {
  data: Record<string, any>[];
  columns?: string[];
  title?: string;
  pageSize?: number;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns: propColumns,
  title = 'Data Records',
  pageSize = 10,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-500">
        No tabular rows available to display.
      </div>
    );
  }

  const columns = propColumns && propColumns.length > 0 ? propColumns : Object.keys(data[0]);

  // Filter
  const filteredData = data.filter((row) =>
    columns.some((col) => {
      const val = row[col];
      return val !== null && val !== undefined && String(val).toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentRows = filteredData.slice(startIndex, startIndex + pageSize);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [columns.join(',')]
        .concat(filteredData.map((row) => columns.map((col) => JSON.stringify(row[col] ?? '')).join(',')))
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">{title}</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            {filteredData.length} records
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search values..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 w-36 sm:w-48 rounded-md border border-slate-700 bg-slate-900 pl-7 pr-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
            title="Download CSV table"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-slate-950 font-medium text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3.5 text-slate-500 font-mono text-[10px]">#</th>
              {columns.map((col) => (
                <th key={col} className="py-2.5 px-3.5 whitespace-nowrap text-slate-300 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {currentRows.map((row, idx) => (
              <tr key={idx} className="transition-colors hover:bg-slate-800/40">
                <td className="py-2 px-3.5 text-[10px] text-slate-500">{startIndex + idx + 1}</td>
                {columns.map((col) => {
                  const val = row[col];
                  const isNum = typeof val === 'number';
                  return (
                    <td key={col} className="py-2 px-3.5 whitespace-nowrap">
                      {val === null || val === undefined ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : isNum ? (
                        <span className="text-blue-300">
                          {Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)}
                        </span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-4 py-2 text-xs text-slate-400">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded p-1 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded p-1 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

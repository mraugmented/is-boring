'use client';

import { useState } from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => string;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export default function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = 'No data found',
  onRowClick,
  getRowKey,
  selectedRows,
  onSelectionChange,
  pagination,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = (a as Record<string, unknown>)[sortKey];
    const bVal = (b as Record<string, unknown>)[sortKey];
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const comparison = aVal < bVal ? -1 : 1;
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedRows?.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(getRowKey));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange || !selectedRows) return;
    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter((r) => r !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };

  const getValue = (item: T, key: string): unknown => {
    if (key.includes('.')) {
      const keys = key.split('.');
      let value: unknown = item;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return value;
    }
    return (item as Record<string, unknown>)[key];
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="p-12 text-center">
          <div className="inline-flex items-center gap-3 text-[var(--text-secondary)]">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="p-12 text-center text-[var(--text-secondary)]">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--bg-muted)]">
            <tr>
              {onSelectionChange && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows?.length === data.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''
                  } ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {sortedData.map((item) => {
              const rowKey = getRowKey(item);
              return (
                <tr
                  key={rowKey}
                  className={`bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${selectedRows?.includes(rowKey) ? 'bg-[var(--accent-soft)]' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {onSelectionChange && (
                    <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows?.includes(rowKey)}
                        onChange={() => toggleRow(rowKey)}
                        className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={String(col.key)} className={`px-4 py-3 text-sm text-[var(--text-primary)] ${col.className || ''}`}>
                      {col.render ? col.render(item) : String(getValue(item, String(col.key)) ?? '-')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="px-3 py-1 text-sm rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

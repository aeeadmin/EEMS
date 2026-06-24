// ── Date helpers ─────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function retirementDate(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  d.setFullYear(d.getFullYear() + 60);
  return d;
}

export function formatRelativeAge(dateStr) {
  if (!dateStr) return '—';
  const createdDate = new Date(dateStr);
  if (isNaN(createdDate.getTime())) return dateStr;
  
  const today = new Date();
  
  // Set both to midnight (00:00:00) in local time to check calendar difference
  const d1 = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return `${diffDays} days ago`;
  }
}

export function formatRelativeAgeWithTime(dateStr) {
  if (!dateStr) return '—';
  const createdDate = new Date(dateStr);
  if (isNaN(createdDate.getTime())) return dateStr;
  
  const age = formatRelativeAge(dateStr);
  const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${age}, ${timeStr}`;
}

// ── String helpers ────────────────────────────────────────────────────────────
export function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function truncate(str, len = 40) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── Export helpers ────────────────────────────────────────────────────────────
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportToCSV(data, filename = 'export') {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportToExcel(data, filename = 'export', sheetName = 'Sheet1') {
  if (!data || !data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ── Status badge helper ───────────────────────────────────────────────────────
export function statusBadgeClass(status = '') {
  switch (status.toLowerCase()) {
    case 'approved': return 'badge-success';
    case 'rejected': return 'badge-danger';
    case 'pending':  return 'badge-warning';
    default:         return 'badge-secondary';
  }
}

export function requestTypeBadgeClass(type = '') {
  switch (type.toLowerCase()) {
    case 'transfer':   return 'req-type-transfer';
    case 'correction': return 'req-type-correction';
    case 'permission': return 'req-type-permission';
    default:           return 'req-type-general';
  }
}

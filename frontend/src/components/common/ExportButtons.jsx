import { exportToCSV, exportToExcel } from '../../utils/helpers';

export default function ExportButtons({ data, filename, onExport, style }) {
  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      <button
        className="btn-outline-custom btn-sm"
        onClick={() => onExport ? onExport('csv') : exportToCSV(data, filename)}
        title="Export as CSV"
      >
        <i className="fa-solid fa-file-csv"></i> CSV
      </button>
      <button
        className="btn-primary-custom btn-sm"
        onClick={() => onExport ? onExport('excel') : exportToExcel(data, filename)}
        title="Export as Excel"
      >
        <i className="fa-solid fa-file-excel"></i> Excel
      </button>
    </div>
  );
}

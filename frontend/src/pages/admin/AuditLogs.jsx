import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import TypeaheadInput from '../../components/common/TypeaheadInput';
import { getAuditLogs, exportData } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ page, limit, search });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await exportData('audit', format);
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `AuditLogs_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      toast.success(`Exported audit logs as ${format.toUpperCase()} successfully`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, search]);

  return (
    <Layout title="TNEB EEMS – Audit Log Trail">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Security Audit Trail</h4>
          <p className="page-subtitle">Inspect user activities, data modifications, security login status, and administrative operations.</p>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar d-flex align-items-center justify-content-between flex-wrap gap-2">
          <TypeaheadInput
            placeholder="Search User ID, Record ID, Action..."
            value={search}
            onChange={setSearch}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            fetchSuggestions={async (query) => {
              try {
                const res = await getAuditLogs({ search: query, limit: 10 });
                return res.data.logs.map(log => ({
                  label: log.user_id || 'System',
                  value: log.user_id || 'System',
                  subLabel: `Action: ${log.action} | Table: ${log.table_name || 'N/A'} | Ref: ${log.record_id || 'N/A'}`
                }));
              } catch (err) {
                return [];
              }
            }}
          />
          <div className="d-flex gap-2">
            <button 
              onClick={() => handleExport('excel')} 
              className="btn btn-primary-custom btn-sm text-white"
            >
              <i className="fa-solid fa-file-excel"></i> Export as Excel
            </button>
            <button 
              onClick={() => handleExport('csv')} 
              className="btn btn-outline-custom btn-sm"
            >
              <i className="fa-solid fa-file-csv"></i> Export as CSV
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="table-scroll">
            <table className="m-0">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Log ID</th>
                  <th>Timestamp</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record Reference</th>
                  <th>IP Address</th>
                  <th>Details (JSON)</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-secondary">No audit logs recorded</td>
                  </tr>
                ) : (
                  logs.map((l, index) => (
                    <tr key={l.id}>
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td className="fw-semibold">#{l.id}</td>
                      <td>{new Date(l.created_at).toLocaleString()}</td>
                      <td>{l.user_id}</td>
                      <td>{l.role}</td>
                      <td className="fw-bold">{l.action}</td>
                      <td className="text-muted">{l.table_name || 'N/A'}</td>
                      <td>{l.record_id || 'N/A'}</td>
                      <td><code>{l.ip_address}</code></td>
                      <td>
                        <div 
                          className="audit-changes"
                          title={`Old Value: ${l.old_value ? JSON.stringify(l.old_value) : 'None'}\nNew Value: ${l.new_value ? JSON.stringify(l.new_value) : 'None'}`}
                          style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {l.new_value ? JSON.stringify(l.new_value) : l.old_value ? JSON.stringify(l.old_value) : 'No value details'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination 
          page={page} 
          pages={Math.ceil(total / limit)} 
          total={total} 
          limit={limit}
          onPageChange={setPage} 
        />
      </div>
    </Layout>
  );
}

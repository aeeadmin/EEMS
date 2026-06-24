import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TypeaheadInput from '../../components/common/TypeaheadInput';
import { getUpcomingRetirements, getRetirementArchive, exportData } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function UpcomingRetirement() {
  const [retirements, setRetirements] = useState([]);
  const [archive, setArchive] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  const loadData = async () => {
    setLoading(true);
    try {
      const upRes = await getUpcomingRetirements({ search });
      setRetirements(upRes.data.retirements);

      const archRes = await getRetirementArchive({ search });
      setArchive(archRes.data.archive);
    } catch (err) {
      toast.error('Failed to load retirement lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleExport = async (format) => {
    try {
      const res = await exportData('retirements', format);
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Retirements_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      toast.success(`Exported as ${format.toUpperCase()} successfully`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const getRowClass = (days) => {
    if (days <= 30) return 'retirement-row-red';
    if (days <= 90) return 'retirement-row-orange';
    if (days <= 180) return 'retirement-row-yellow';
    return '';
  };

  return (
    <Layout title="TNEB EEMS – Retirement Management">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Retirement Management</h4>
          <p className="page-subtitle">Track employees nearing superannuation (age 58) or search archived historical records.</p>
        </div>
      </div>

      <div className="mb-4">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'upcoming' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming Retirements (Next 6 Months)
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'archive' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('archive')}
            >
              Retirement Archive
            </button>
          </li>
        </ul>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : activeTab === 'upcoming' ? (
        <div className="table-wrapper">
          <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <TypeaheadInput
              placeholder="Search Name, ID, District..."
              value={search}
              onChange={setSearch}
              onSearch={(val) => {
                setSearch(val);
              }}
              fetchSuggestions={async (query) => {
                try {
                  const res = await getUpcomingRetirements({ search: query });
                  return res.data.retirements.map(emp => ({
                    label: emp.name,
                    value: emp.name,
                    subLabel: `${emp.employee_id} | ${emp.position_id} | ${emp.district}`
                  }));
                } catch (err) {
                  console.error(err);
                  return [];
                }
              }}
            />
            <div className="d-flex gap-2">
              <button onClick={() => handleExport('excel')} className="btn btn-outline-custom btn-sm">
                <i className="fa-solid fa-file-excel"></i> Export Excel
              </button>
              <button onClick={() => handleExport('csv')} className="btn btn-outline-custom btn-sm">
                <i className="fa-solid fa-file-csv"></i> Export CSV
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table className="m-0">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Position ID</th>
                  <th>Date of Birth</th>
                  <th>Retirement Date</th>
                  <th>Days Remaining</th>
                  <th>District</th>
                  <th>Notification Status</th>
                </tr>
              </thead>
              <tbody>
                {retirements.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-secondary">No upcoming retirements found in the next 6 months.</td>
                  </tr>
                ) : (
                  retirements.map((emp, index) => (
                    <tr key={emp.id} className={getRowClass(emp.days_remaining)}>
                      <td>{index + 1}</td>
                      <td>{emp.employee_id}</td>
                      <td>{emp.name}</td>
                      <td>{emp.position_id}</td>
                      <td>{new Date(emp.date_of_birth).toLocaleDateString()}</td>
                      <td className="fw-bold">{new Date(emp.retirement_date).toLocaleDateString()}</td>
                      <td>
                        <span className="fw-bold text-danger">
                          {emp.days_remaining} days
                        </span>
                      </td>
                      <td>{emp.district}</td>
                      <td>
                        {emp.days_remaining <= 30 ? '1-Month Alert Sent' : emp.days_remaining <= 90 ? '3-Month Alert Sent' : '6-Month Alert Sent'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="table-toolbar">
            <TypeaheadInput
              placeholder="Search Employee, Position ID..."
              value={search}
              onChange={setSearch}
              onSearch={(val) => {
                setSearch(val);
              }}
              fetchSuggestions={async (query) => {
                try {
                  const res = await getRetirementArchive({ search: query });
                  return res.data.archive.map(arch => ({
                    label: arch.employee_id,
                    value: arch.employee_id,
                    subLabel: `Position: ${arch.position_id} | Retired: ${new Date(arch.retired_date).toLocaleDateString()}`
                  }));
                } catch (err) {
                  return [];
                }
              }}
            />
          </div>
          <div className="table-scroll">
            <table className="m-0">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Employee ID</th>
                  <th>Position ID</th>
                  <th>Retired Date</th>
                  <th>Archived Metadata</th>
                </tr>
              </thead>
              <tbody>
                {archive.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-secondary">No archived records found.</td>
                  </tr>
                ) : (
                  archive.map((arch, index) => (
                    <tr key={arch.id}>
                      <td>{index + 1}</td>
                      <td>{arch.employee_id}</td>
                      <td>{arch.position_id}</td>
                      <td className="fw-bold text-secondary">{new Date(arch.retired_date).toLocaleDateString()}</td>
                      <td>
                        Record preserved in archive schema format. Designation Email mapping permanently preserved.
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

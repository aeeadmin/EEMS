import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import RequestDialog from '../../components/employee/RequestDialog';
import ExportButtons from '../../components/common/ExportButtons';
import TypeaheadInput from '../../components/common/TypeaheadInput';
import { getEmployees, createRequest, exportData } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';

export default function ManagerEmployeeDetails() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [initialField, setInitialField] = useState(null);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await getEmployees({
        page,
        limit,
        search,
        district: user?.district
      });
      setEmployees(res.data.employees);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [page, search, user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadEmployees();
  };

  const openInlineEdit = (emp, field) => {
    setSelectedEmployee(emp);
    setInitialField(field);
    setShowRequestModal(true);
  };

  const openGeneralRequest = (emp) => {
    setSelectedEmployee(emp);
    setInitialField(null);
    setShowRequestModal(true);
  };

  const handleRequestSubmit = async (requestData) => {
    try {
      await createRequest(requestData);
      toast.success('Request submitted successfully');
      setShowRequestModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await exportData('employees', format);
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `District_Employees_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      toast.success(`Exported as ${format.toUpperCase()} successfully`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  return (
    <Layout title="TNEB EEMS – Employee Details Directory">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Employee Details Directory</h4>
          <p className="page-subtitle">View profiles. Hover and click the pencil icon to request edits, or click "Request" for administrative changes.</p>
        </div>
        <ExportButtons onExport={handleExport} />
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <TypeaheadInput
            placeholder="Search Name, ID, Phone, Email..."
            value={search}
            onChange={setSearch}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            fetchSuggestions={async (query) => {
              try {
                const res = await getEmployees({ 
                  search: query, 
                  district: user?.district,
                  limit: 10 
                });
                return res.data.employees.map(emp => ({
                  label: emp.name,
                  value: emp.name,
                  subLabel: `${emp.employee_id} | ${emp.designation || 'AE'} | ${emp.district}`
                }));
              } catch (err) {
                console.error(err);
                return [];
              }
            }}
          />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="table-scroll">
            <table className="m-0">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Designation</th>
                  <th>Position ID</th>
                  <th>Name</th>
                  <th>Date Of Birth</th>
                  <th>Designation Email</th>
                  <th>Name Based Email</th>
                  <th>Phone Number</th>
                  <th>District</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-secondary">No employees found in this district</td>
                  </tr>
                ) : (
                  employees.map((emp, index) => {
                    const desig = emp.designation || emp.position_id.substring(2, emp.position_id.length - 4);
                    return (
                      <tr key={emp.id}>
                        <td>{(page - 1) * limit + index + 1}</td>
                        <td>{desig}</td>
                        <td>{emp.position_id}</td>
                        <td>{emp.name}</td>
                        <td>{new Date(emp.date_of_birth).toLocaleDateString()}</td>
                        
                        {/* Designation Email Cell (Hover Pencil) */}
                        <td className="position-relative">
                          <div className="d-flex align-items-center justify-content-between">
                            <span>{emp.designation_email || 'N/A'}</span>
                            <button 
                              className="btn-icon edit-pencil ms-2"
                              onClick={() => openInlineEdit(emp, 'designation_email')}
                              title="Request Edit"
                            >
                              <i className="fa-solid fa-pencil text-muted" style={{ fontSize: '11px' }}></i>
                            </button>
                          </div>
                        </td>

                        {/* Personal Email Cell (Hover Pencil) */}
                        <td className="position-relative">
                          <div className="d-flex align-items-center justify-content-between">
                            <span>{emp.name_based_email}</span>
                            <button 
                              className="btn-icon edit-pencil ms-2"
                              onClick={() => openInlineEdit(emp, 'name_based_email')}
                              title="Request Edit"
                            >
                              <i className="fa-solid fa-pencil text-muted" style={{ fontSize: '11px' }}></i>
                            </button>
                          </div>
                        </td>

                        {/* Phone Number Cell (Hover Pencil) */}
                        <td className="position-relative">
                          <div className="d-flex align-items-center justify-content-between">
                            <span>{emp.phone_number}</span>
                            <button 
                              className="btn-icon edit-pencil ms-2"
                              onClick={() => openInlineEdit(emp, 'phone_number')}
                              title="Request Edit"
                            >
                              <i className="fa-solid fa-pencil text-muted" style={{ fontSize: '11px' }}></i>
                            </button>
                          </div>
                        </td>

                        <td>{emp.district}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-custom"
                            onClick={() => openGeneralRequest(emp)}
                          >
                            <i className="fa-solid fa-file-signature"></i> Request
                          </button>
                        </td>
                      </tr>
                    );
                  })
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

      {showRequestModal && (
        <RequestDialog 
          employee={selectedEmployee}
          initialField={initialField}
          onClose={() => setShowRequestModal(false)}
          onSubmit={handleRequestSubmit}
        />
      )}
    </Layout>
  );
}

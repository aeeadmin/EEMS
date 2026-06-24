import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import ExportButtons from '../../components/common/ExportButtons';
import RequestDialog from '../../components/employee/RequestDialog';
import TypeaheadInput from '../../components/common/TypeaheadInput';
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee, 
  exportData
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';

export default function EmployeeDetails() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Search and Filter
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [isActive, setIsActive] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('ASC');
  
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Form States
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [nameBasedEmail, setNameBasedEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [empDistrict, setEmpDistrict] = useState('');
  const [posId, setPosId] = useState('');
  const [empDesignation, setEmpDesignation] = useState('AE');
  const [designationEmail, setDesignationEmail] = useState('');
  const [password, setPassword] = useState('');

  const districtsList = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Vellore', 'Erode', 'Tiruppur', 'Thoothukudi',
    'Dindigul', 'Thanjavur', 'Ranipet', 'Krishnagiri', 'Namakkal',
    'Kancheepuram', 'Villupuram', 'Cuddalore', 'Nagapattinam', 'Perambalur',
    'Ariyalur', 'Karur', 'Sivaganga', 'Virudhunagar', 'Ramanathapuram',
    'Theni', 'Nilgiris', 'Tiruvannamalai', 'Pudukkottai', 'Tiruvarur'
  ];

  const designationsList = ['AE', 'AEE', 'EE', 'SE', 'CE'];

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await getEmployees({
        page,
        limit,
        search,
        district,
        is_active: isActive,
        sortBy,
        sortOrder
      });
      setEmployees(res.data.employees);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load employee list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [page, search, district, isActive, sortBy, sortOrder]);

  useEffect(() => {
    if (posId) {
      setDesignationEmail(`${posId.toLowerCase()}@tnebnet.org`);
    } else {
      setDesignationEmail('');
    }
  }, [posId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadEmployees();
  };

  const handleSort = (field) => {
    const isAsc = sortBy === field && sortOrder === 'ASC';
    setSortOrder(isAsc ? 'DESC' : 'ASC');
    setSortBy(field);
  };

  // Add Employee Form Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!designationEmail.toLowerCase().endsWith('@tnebnet.org')) {
      toast.error('Designation email must end with @tnebnet.org');
      return;
    }
    if (!nameBasedEmail.toLowerCase().endsWith('@tnebltd.org')) {
      toast.error('Name Based email must end with @tnebltd.org');
      return;
    }
    try {
      await createEmployee({
        employee_id: empId,
        name,
        designation: empDesignation,
        date_of_birth: dob,
        name_based_email: nameBasedEmail,
        phone_number: phone,
        district: empDistrict,
        position_id: posId,
        designation_email: designationEmail,
        password: password
      });
      toast.success('Employee created successfully');
      setShowAddModal(false);
      resetForm();
      loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create employee');
    }
  };

  // Edit Employee Form Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (nameBasedEmail && !nameBasedEmail.toLowerCase().endsWith('@tnebltd.org')) {
      toast.error('Name Based email must end with @tnebltd.org');
      return;
    }
    try {
      await updateEmployee(selectedEmployee.id, {
        name,
        name_based_email: nameBasedEmail,
        phone_number: phone,
        district: empDistrict,
        is_active: selectedEmployee.is_active
      });
      toast.success('Employee updated successfully');
      setShowEditModal(false);
      resetForm();
      loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update employee');
    }
  };

  // Deactivate Employee
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await deleteEmployee(id);
        toast.success('Employee deactivated');
        loadEmployees();
      } catch (err) {
        toast.error('Failed to deactivate employee');
      }
    }
  };

  const openEditModal = (emp) => {
    setSelectedEmployee(emp);
    setName(emp.name);
    setNameBasedEmail(emp.name_based_email);
    setPhone(emp.phone_number);
    setEmpDistrict(emp.district);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setEmpId('');
    setName('');
    setDob('');
    setNameBasedEmail('');
    setPhone('');
    setEmpDistrict('');
    setPosId('');
    setEmpDesignation('AE');
    setDesignationEmail('');
    setPassword('');
    setSelectedEmployee(null);
  };

  // Data Export Call
  const handleExport = async (format) => {
    try {
      const res = await exportData('employees', format);
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Employees_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      toast.success(`Exported as ${format.toUpperCase()} successfully`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  return (
    <Layout title="TNEB EEMS – Employee Details">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Employee Details Directory</h4>
          <p className="page-subtitle">View, create, edit, or deactivate employee email mappings and profile data.</p>
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <ExportButtons onExport={handleExport} />
          {!(user?.is_view_admin === 1 || user?.is_view_admin === true) && (
            <button 
              onClick={() => { resetForm(); setShowAddModal(true); }} 
              className="btn btn-primary-custom"
            >
              <i className="fa-solid fa-user-plus"></i> Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <TypeaheadInput
            placeholder="Search ID, Name, Phone, Email..."
            value={search}
            onChange={setSearch}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            fetchSuggestions={async (query) => {
              try {
                const res = await getEmployees({ search: query, limit: 10 });
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

          <select 
            className="filter-select" 
            value={district} 
            onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
          >
            <option value="">All Districts</option>
            {districtsList.map((d, idx) => (
              <option key={idx} value={d}>{d}</option>
            ))}
          </select>

          <select 
            className="filter-select" 
            value={isActive} 
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Retired/Inactive</option>
          </select>
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
                  <th onClick={() => handleSort('position_id')}>Position ID <i className="fa-solid fa-sort sort-icon"></i></th>
                  <th onClick={() => handleSort('name')}>Name <i className="fa-solid fa-sort sort-icon"></i></th>
                  <th onClick={() => handleSort('date_of_birth')}>Date Of Birth <i className="fa-solid fa-sort sort-icon"></i></th>
                  <th>Designation Email</th>
                  <th onClick={() => handleSort('name_based_email')}>Name Based Email <i className="fa-solid fa-sort sort-icon"></i></th>
                  <th onClick={() => handleSort('phone_number')}>Phone Number <i className="fa-solid fa-sort sort-icon"></i></th>
                  <th onClick={() => handleSort('district')}>District <i className="fa-solid fa-sort sort-icon"></i></th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-secondary">No employees found</td>
                  </tr>
                ) : (
                  employees.map((emp, index) => (
                    <tr key={emp.id}>
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td>{emp.designation || 'AE'}</td>
                      <td>{emp.position_id}</td>
                      <td>{emp.name}</td>
                      <td>{new Date(emp.date_of_birth).toLocaleDateString()}</td>
                      <td>{emp.designation_email || 'N/A'}</td>
                      <td>{emp.name_based_email}</td>
                      <td>{emp.phone_number}</td>
                      <td>{emp.district}</td>
                      <td>{emp.is_active ? 'Active' : 'Inactive'}</td>
                      <td>
                        {!(user?.is_view_admin === 1 || user?.is_view_admin === true) ? (
                          <div className="action-btns">
                            <button 
                              className="btn btn-sm btn-edit" 
                              title="Edit"
                              onClick={() => openEditModal(emp)}
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            {emp.is_active === 1 && (
                              <button 
                                className="btn btn-sm btn-reject" 
                                title="Deactivate"
                                onClick={() => handleDelete(emp.id)}
                              >
                                <i className="fa-solid fa-user-slash"></i>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>Read-only</span>
                        )}
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

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h5 className="modal-title">Create Employee Record</h5>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div className="row g-3">
                  <div className="col-md-6 form-group">
                    <label className="form-label">Employee ID (Unique, 8 characters) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom" 
                      maxLength="8"
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                      placeholder="e.g. EMP12345"
                      required 
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name"
                      required 
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Date of Birth <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="date" 
                      className="form-control-custom" 
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Position ID (Unique, 9 characters) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom" 
                      maxLength="9"
                      value={posId}
                      onChange={(e) => setPosId(e.target.value.toUpperCase())}
                      placeholder="e.g. MUDAE1234"
                      required 
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Name Based Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="email" 
                      className="form-control-custom" 
                      value={nameBasedEmail}
                      onChange={(e) => setNameBasedEmail(e.target.value)}
                      placeholder="e.g. name@tnebltd.org"
                      required 
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Phone Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      required 
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">District <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select 
                      className="form-control-custom" 
                      value={empDistrict}
                      onChange={(e) => setEmpDistrict(e.target.value)}
                      required
                    >
                      <option value="">Select District</option>
                      {districtsList.map((d, idx) => (
                        <option key={idx} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Engineering Designation <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select 
                      className="form-control-custom" 
                      value={empDesignation}
                      onChange={(e) => setEmpDesignation(e.target.value)}
                      required
                    >
                      {designationsList.map((d, idx) => (
                        <option key={idx} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Designation Email (Unique) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="email" 
                      className="form-control-custom" 
                      value={designationEmail}
                      onChange={(e) => setDesignationEmail(e.target.value)}
                      placeholder="e.g. name@tnebnet.org"
                      required 
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Employee Portal Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter login password"
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary-custom btn-sm">
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h5 className="modal-title">Edit Employee details</h5>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control-custom" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Name Based Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="email" 
                    className="form-control-custom" 
                    value={nameBasedEmail}
                    onChange={(e) => setNameBasedEmail(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Phone Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control-custom" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">District <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="form-control-custom" 
                    value={empDistrict}
                    onChange={(e) => setEmpDistrict(e.target.value)}
                    required
                  >
                    {districtsList.map((d, idx) => (
                      <option key={idx} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary-custom btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

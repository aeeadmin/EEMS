import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import ExportButtons from '../../components/common/ExportButtons';
import TypeaheadInput from '../../components/common/TypeaheadInput';
import { getAdmins, createAdmin, updateAdmin, deactivateAdmin, exportData, getEmployees } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDetails() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isViewAdmin, setIsViewAdmin] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Form states
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [designation, setDesignation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nameBasedEmail, setNameBasedEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [positionId, setPositionId] = useState('');

  const districtsList = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Vellore', 'Erode', 'Tiruppur', 'Thoothukudi',
    'Dindigul', 'Thanjavur', 'Ranipet', 'Krishnagiri', 'Namakkal',
    'Kancheepuram', 'Villupuram', 'Cuddalore', 'Nagapattinam', 'Perambalur',
    'Ariyalur', 'Karur', 'Sivaganga', 'Virudhunagar', 'Ramanathapuram',
    'Theni', 'Nilgiris', 'Tiruvannamalai', 'Pudukkottai', 'Tiruvarur'
  ];

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await getAdmins({ page, limit, search });
      setAdmins(res.data.admins);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load admin accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, [page, search]);

  // Auto-fill employee details when Employee ID is typed
  useEffect(() => {
    if (employeeId && employeeId.trim().length >= 4) {
      const fetchDetails = async () => {
        try {
          const res = await getEmployees({ search: employeeId, limit: 10 });
          if (res.data && res.data.employees) {
            const emp = res.data.employees.find(
              (e) => e.employee_id.toUpperCase() === employeeId.toUpperCase()
            );
            if (emp) {
              setName(emp.name || '');
              setDesignation(emp.designation || '');
              setDateOfBirth(emp.date_of_birth ? emp.date_of_birth.split('T')[0] : '');
              setNameBasedEmail(emp.name_based_email || '');
              setPhoneNumber(emp.phone_number || '');
              setPositionId(emp.position_id || '');
              setDistrict(emp.district || '');
              setEmail(emp.designation_email || '');
              
              if (emp.manager_unique_id || emp.admin_unique_id) {
                toast.error(`Employee ${employeeId} is already associated with a manager or admin account.`);
              }
            }
          }
        } catch (err) {
          console.error('Failed to auto-lookup employee:', err);
        }
      };
      const debounceTimer = setTimeout(fetchDetails, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      setName('');
      setDesignation('');
      setDateOfBirth('');
      setNameBasedEmail('');
      setPhoneNumber('');
      setPositionId('');
      setDistrict('');
      setEmail('');
    }
  }, [employeeId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadAdmins();
  };

  const handlePositionIdChange = (val) => {
    setPositionId(val);
    if (val) {
      setEmail(`${val.toLowerCase()}@tnebnet.org`);
    } else {
      setEmail('');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (email && !email.toLowerCase().endsWith('@tnebnet.org')) {
      toast.error('Designation email must end with @tnebnet.org');
      return;
    }
    if (nameBasedEmail && !nameBasedEmail.toLowerCase().endsWith('@tnebltd.org')) {
      toast.error('Name Based email must end with @tnebltd.org');
      return;
    }
    try {
      await createAdmin({
        employeeId,
        name,
        designation,
        dateOfBirth,
        nameBasedEmail,
        phoneNumber,
        positionId,
        userId,
        username,
        password,
        email,
        district,
        isViewAdmin
      });
      toast.success('Admin created successfully');
      setShowAddModal(false);
      resetForm();
      loadAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (email && !email.toLowerCase().endsWith('@tnebnet.org')) {
      toast.error('Designation email must end with @tnebnet.org');
      return;
    }
    try {
      await updateAdmin(selectedAdmin.id, {
        email,
        district,
        is_active: selectedAdmin.is_active
      });
      toast.success('Admin details updated');
      setShowEditModal(false);
      resetForm();
      loadAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update admin');
    }
  };

  const handleDeactivate = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this admin? This will invalidate their credentials.')) {
      try {
        await deactivateAdmin(id);
        toast.success('Admin deactivated');
        loadAdmins();
      } catch (err) {
        toast.error('Deactivation failed');
      }
    }
  };

  const openEditModal = (adm) => {
    setSelectedAdmin(adm);
    setEmail(adm.email);
    setDistrict(adm.district);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setEmployeeId('');
    setName('');
    setUsername('');
    setUserId('');
    setPassword('');
    setEmail('');
    setDistrict('');
    setDesignation('');
    setDateOfBirth('');
    setNameBasedEmail('');
    setPhoneNumber('');
    setPositionId('');
    setSelectedAdmin(null);
    setIsViewAdmin(false);
  };

  const handleExport = async (format) => {
    try {
      const res = await exportData('admins', format);
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Admins_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  return (
    <Layout title="TNEB EEMS – Admin Details">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Admins Administration</h4>
          <p className="page-subtitle">Add, edit, or deactivate Administrator accounts and view profile associations.</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {!(user?.is_view_admin === 1 || user?.is_view_admin === true) && (
            <button 
              className="btn btn-primary-custom btn-sm"
              onClick={() => {
                resetForm();
                setIsViewAdmin(true);
                setShowAddModal(true);
              }}
            >
              <i className="fa-solid fa-user-shield me-1"></i> Add View Admin
            </button>
          )}
          <ExportButtons onExport={handleExport} />
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <TypeaheadInput
            placeholder="Search Admin Name, ID..."
            value={search}
            onChange={setSearch}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            fetchSuggestions={async (query) => {
              try {
                const res = await getAdmins({ search: query, limit: 10 });
                return res.data.admins.map(adm => ({
                  label: adm.name || adm.admin_unique_id,
                  value: adm.name || adm.admin_unique_id,
                  subLabel: `${adm.admin_unique_id} | ${adm.employee_id} | ${adm.district}`
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
                  <th>Admin ID (User ID)</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Position ID (Token)</th>
                  <th>Email</th>
                  <th>District</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-secondary">No admins found</td>
                  </tr>
                ) : (
                  admins.map((adm, index) => (
                    <tr key={adm.id}>
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td>
                        {adm.admin_unique_id}
                        {adm.is_view_admin === 1 && ' (Read-Only)'}
                      </td>
                      <td>{adm.employee_id}</td>
                      <td>{adm.name || 'N/A'}</td>
                      <td>{adm.token_number}</td>
                      <td>{adm.email}</td>
                      <td>{adm.district}</td>
                      <td>{adm.is_active ? 'Active' : 'Inactive'}</td>
                      <td>
                        {!(user?.is_view_admin === 1 || user?.is_view_admin === true) ? (
                          <div className="action-btns">
                            <button 
                              className="btn btn-sm btn-edit" 
                              onClick={() => openEditModal(adm)}
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            {adm.is_active === 1 && adm.admin_unique_id !== 'ADM001' && (
                              <button 
                                className="btn btn-sm btn-reject" 
                                onClick={() => handleDeactivate(adm.id)}
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

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h5 className="modal-title">Create Admin Account</h5>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div className="row g-3">
                  <div className="col-md-6 form-group">
                    <label className="form-label">Employee ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                      placeholder="e.g. EMP12345"
                      required
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">User ID (Unique login, e.g. ADM002) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value.toUpperCase())}
                      placeholder="e.g. ADM002"
                      required
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Full Name <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(Auto-fetched)</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom bg-light"
                      value={name}
                      readOnly
                      placeholder="Auto-filled from employee details"
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Username <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Login username"
                      required
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="password" 
                      className="form-control-custom"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Designation <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(Auto-fetched)</span></label>
                    <select 
                      className="form-control-custom bg-light"
                      value={designation}
                      disabled
                    >
                      <option value="">Select Designation</option>
                      <option value="AE">AE (Assistant Engineer)</option>
                      <option value="AEE">AEE (Assistant Executive Engineer)</option>
                      <option value="EE">EE (Executive Engineer)</option>
                      <option value="SE">SE (Superintending Engineer)</option>
                      <option value="CE">CE (Chief Engineer)</option>
                    </select>
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Date of Birth <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(Auto-fetched)</span></label>
                    <input 
                      type="date" 
                      className="form-control-custom bg-light"
                      value={dateOfBirth}
                      readOnly
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Name Based Email <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(Auto-fetched)</span></label>
                    <input 
                      type="email" 
                      className="form-control-custom bg-light"
                      value={nameBasedEmail}
                      readOnly
                      placeholder="Auto-filled from employee details"
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Phone Number <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(Auto-fetched)</span></label>
                    <input 
                      type="tel" 
                      className="form-control-custom bg-light"
                      value={phoneNumber}
                      readOnly
                      placeholder="Auto-filled from employee details"
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Position ID (Token Number) <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(Auto-fetched)</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom bg-light"
                      value={positionId}
                      readOnly
                      placeholder="Auto-filled from employee details"
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">Designation Email <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(Auto-fetched)</span></label>
                    <input 
                      type="email" 
                      className="form-control-custom bg-light"
                      value={email}
                      readOnly
                      placeholder="Auto-filled from employee details"
                    />
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label">District Jurisdiction <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(Auto-fetched)</span></label>
                    <select 
                      className="form-control-custom bg-light"
                      value={district}
                      disabled
                    >
                      <option value="">Select District</option>
                      {districtsList.map((d, idx) => (
                        <option key={idx} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 form-group">
                    <div className="checkbox-item mt-2">
                      <input 
                        type="checkbox" 
                        id="is_view_admin"
                        checked={isViewAdmin}
                        onChange={(e) => setIsViewAdmin(e.target.checked)}
                      />
                      <label htmlFor="is_view_admin" className="fw-semibold text-warning" style={{ fontSize: '13px', cursor: 'pointer' }}>
                        Create as "View Admin" (Read-Only monitoring access to dashboard)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary-custom btn-sm">
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h5 className="modal-title">Edit Admin Details</h5>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label className="form-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="email" 
                    className="form-control-custom"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">District Jurisdiction <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="form-control-custom"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
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

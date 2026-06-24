import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import TypeaheadInput from '../../components/common/TypeaheadInput';
import { getMyRequests, api } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { formatRelativeAge } from '../../utils/helpers';
import toast, { Toaster } from 'react-hot-toast';

export default function RequestStatus() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit fields modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Dynamic fields state for editing
  const [phoneVal, setPhoneVal] = useState('');
  const [nameBasedEmailVal, setNameBasedEmailVal] = useState('');
  const [desigEmailVal, setDesigEmailVal] = useState('');

  const { socket } = useSocket();

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await getMyRequests({ page, limit, search });
      setRequests(res.data.requests);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load submitted requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    if (socket) {
      socket.on('request:updated', loadRequests);
    }

    return () => {
      if (socket) {
        socket.off('request:updated', loadRequests);
      }
    };
  }, [page, search, socket]);

  const handleEditClick = (req) => {
    setSelectedRequest(req);
    // Pre-fill fields with empty or fetch employee
    setPhoneVal(req.phone_number || '');
    setNameBasedEmailVal(req.name_based_email || '');
    setDesigEmailVal(req.designation_email || '');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const permitted = parseEditableColumns(selectedRequest.editable_columns);
    
    if (permitted.includes('designation_email') && desigEmailVal && !desigEmailVal.toLowerCase().endsWith('@tnebnet.org')) {
      toast.error('Designation email must end with @tnebnet.org');
      return;
    }
    if (permitted.includes('name_based_email') && nameBasedEmailVal && !nameBasedEmailVal.toLowerCase().endsWith('@tnebltd.org')) {
      toast.error('Name Based email must end with @tnebltd.org');
      return;
    }

    const edits = {};
    if (permitted.includes('phone_number')) edits.phone_number = phoneVal;
    if (permitted.includes('name_based_email')) edits.name_based_email = nameBasedEmailVal;
    if (permitted.includes('designation_email')) edits.designation_email = desigEmailVal;

    try {
      await api.put(`/requests/${selectedRequest.id}/submit-edits`, { edits });
      toast.success('Edits submitted for Final Admin Approval');
      setShowEditModal(false);
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit edits');
    }
  };

  const parseEditableColumns = (cols) => {
    if (!cols) return [];
    if (Array.isArray(cols)) return cols;
    try {
      const parsed = typeof cols === 'string' ? JSON.parse(cols) : cols;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const getPermittedFieldsList = (colsJson) => {
    const cols = parseEditableColumns(colsJson);
    return cols.map(c => c === 'name_based_email' ? 'Name Based Email' : c.replace(/_/g, ' ')).join(', ');
  };

  return (
    <Layout title="TNEB EEMS – My Request Status">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Submitted Request Log</h4>
          <p className="page-subtitle">Track the status of your administrative or profile edit requests. Edit permitted columns here.</p>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <TypeaheadInput
            placeholder="Search Employee, ID, Subject..."
            value={search}
            onChange={setSearch}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            fetchSuggestions={async (query) => {
              try {
                const res = await getMyRequests({ search: query, limit: 10 });
                return res.data.requests.map(req => ({
                  label: req.employee_name || req.employee_id,
                  value: req.employee_name || req.employee_id,
                  subLabel: `Req ID: #${req.id} | Position: ${req.position_id} | Type: ${req.request_type}`
                }));
              } catch (err) {
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
                  <th>Req ID</th>
                  <th>Employee Name</th>
                  <th>Position ID</th>
                  <th>Request Type</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Authorized Columns</th>
                  <th>Action / Feedback</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-secondary">No requests found</td>
                  </tr>
                ) : (
                  requests.map((r) => {
                    const permittedFields = getPermittedFieldsList(r.editable_columns);
                    const parsedCols = parseEditableColumns(r.editable_columns);
                    const hasPermission = r.status === 'APPROVED' && parsedCols.length > 0;

                    return (
                      <tr key={r.id}>
                        <td className="fw-semibold">#{r.id}</td>
                        <td>{r.employee_name || r.employee_id}</td>
                        <td>{r.position_id}</td>
                        <td>{r.request_type}</td>
                        <td>{r.subject}</td>
                        <td>{r.status}</td>
                        <td>
                          {new Date(r.created_at).toLocaleDateString()} ({formatRelativeAge(r.created_at)})
                        </td>
                        <td className="text-secondary fw-semibold" style={{ fontSize: '12px' }}>
                          {permittedFields || 'None'}
                        </td>
                        <td>
                          {hasPermission ? (
                            <button 
                              className="btn btn-sm btn-approve"
                              onClick={() => handleEditClick(r)}
                              title="Edit Authorized Fields"
                            >
                              <i className="fa-solid fa-pen-to-square"></i> Edit Fields
                            </button>
                          ) : (
                            <div className="text-muted" style={{ fontSize: '11px', maxWidth: '200px' }} title={r.comments}>
                              {r.comments || 'Awaiting response'}
                            </div>
                          )}
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

      {/* Edit Permitted Fields Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h5 className="modal-title">Edit Permitted Employee Fields</h5>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  You are authorized to edit the following columns for Request #{selectedRequest?.id}. 
                  Submitting will send changes to Admin for final database approval.
                </p>

                {parseEditableColumns(selectedRequest?.editable_columns).includes('phone_number') && (
                  <div className="form-group mb-3">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="text" 
                      className="form-control-custom"
                      value={phoneVal}
                      onChange={(e) => setPhoneVal(e.target.value)}
                      placeholder="Enter new phone number"
                      required
                    />
                  </div>
                )}

                {parseEditableColumns(selectedRequest?.editable_columns).includes('name_based_email') && (
                  <div className="form-group mb-3">
                    <label className="form-label">Name Based Email</label>
                    <input 
                      type="email" 
                      className="form-control-custom"
                      value={nameBasedEmailVal}
                      onChange={(e) => setNameBasedEmailVal(e.target.value)}
                      placeholder="Enter new name based email"
                      required
                    />
                  </div>
                )}

                {parseEditableColumns(selectedRequest?.editable_columns).includes('designation_email') && (
                  <div className="form-group mb-3">
                    <label className="form-label">Designation Email</label>
                    <input 
                      type="email" 
                      className="form-control-custom"
                      value={desigEmailVal}
                      onChange={(e) => setDesigEmailVal(e.target.value)}
                      placeholder="Enter new designation email"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary-custom btn-sm">
                  Submit Edits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

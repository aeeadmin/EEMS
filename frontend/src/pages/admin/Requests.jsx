import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import ColumnPermissionModal from '../../components/employee/ColumnPermissionModal';
import TypeaheadInput from '../../components/common/TypeaheadInput';
import { getRequests, approveRequest, rejectRequest, exportData, api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeAge } from '../../utils/helpers';
import { useSocket } from '../../hooks/useSocket';
import toast, { Toaster } from 'react-hot-toast';

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState('');
  const [district, setDistrict] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const districtsList = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Vellore', 'Erode', 'Tiruppur', 'Thoothukudi',
    'Dindigul', 'Thanjavur', 'Ranipet', 'Krishnagiri', 'Namakkal',
    'Kancheepuram', 'Villupuram', 'Cuddalore', 'Nagapattinam', 'Perambalur',
    'Ariyalur', 'Karur', 'Sivaganga', 'Virudhunagar', 'Ramanathapuram',
    'Theni', 'Nilgiris', 'Tiruvannamalai', 'Pudukkottai', 'Tiruvarur'
  ];

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComments, setRejectComments] = useState('');

  const { socket } = useSocket();

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await getRequests({ page, limit, status, district, search });
      setRequests(res.data.requests);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    if (socket) {
      socket.on('request:new', loadRequests);
      socket.on('request:updated', loadRequests);
    }

    return () => {
      if (socket) {
        socket.off('request:new', loadRequests);
        socket.off('request:updated', loadRequests);
      }
    };
  }, [page, status, district, search, socket]);

  const handleApproveClick = (req) => {
    setSelectedRequest(req);
    setShowPermissionModal(true);
  };

  const handleApproveSubmit = async ({ editableColumns, comments }) => {
    try {
      await approveRequest(selectedRequest.id, { editableColumns, comments });
      toast.success('Edit permission granted to Manager');
      setShowPermissionModal(false);
      loadRequests();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleRejectClick = (req) => {
    setSelectedRequest(req);
    setRejectComments('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      await rejectRequest(selectedRequest.id, { comments: rejectComments });
      toast.success('Request rejected');
      setShowRejectModal(false);
      loadRequests();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  // Final Action triggers
  const handleFinalApproval = async (id, approve) => {
    try {
      await api.put(`/requests/${id}/final-approve`, { approve });
      toast.success(approve ? 'Changes applied to database' : 'Changes discarded');
      loadRequests();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await exportData('requests', format);
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Requests_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  // Helper to parse comments and check if it contains proposed edits
  const getProposedEdits = (comments) => {
    if (!comments) return null;
    try {
      const parsed = JSON.parse(comments);
      if (parsed && parsed.edits) {
        return parsed.edits;
      }
    } catch (e) {
      // not JSON
    }
    return null;
  };

  return (
    <Layout title="TNEB EEMS – Requests Management">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Approval Requests Workflow</h4>
          <p className="page-subtitle">Approve field edit permissions, review submitted edits, and final-approve modifications.</p>
        </div>

        <div className="d-flex gap-2">
          <button onClick={() => handleExport('excel')} className="btn btn-outline-custom btn-sm">
            <i className="fa-solid fa-file-excel"></i> Export Excel
          </button>
          <button onClick={() => handleExport('csv')} className="btn btn-outline-custom btn-sm">
            <i className="fa-solid fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <TypeaheadInput
            placeholder="Search Requests..."
            value={search}
            onChange={setSearch}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            fetchSuggestions={async (query) => {
              try {
                const res = await getRequests({ search: query, limit: 10 });
                return res.data.requests.map(r => ({
                  label: r.employee_name || r.employee_id,
                  value: r.employee_name || r.employee_id,
                  subLabel: `Req #${r.id} | ${r.request_type} | ${r.status}`
                }));
              } catch (err) {
                console.error(err);
                return [];
              }
            }}
          />

          <select 
            className="filter-select" 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved / In-Progress</option>
            <option value="REJECTED">Rejected</option>
          </select>

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
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="table-scroll">
            <table className="m-0">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Req ID</th>
                  <th>Employee Name</th>
                  <th>Position ID</th>
                  <th>District</th>
                  <th>Request Type</th>
                  <th>Requested By</th>
                  <th>Details / Edits</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-4 text-secondary">No requests found</td>
                  </tr>
                ) : (
                  requests.map((r, index) => {
                    const proposed = getProposedEdits(r.comments);
                    const isPendingFinal = r.status === 'PENDING' && proposed !== null;

                    return (
                      <tr key={r.id}>
                        <td>{(page - 1) * limit + index + 1}</td>
                        <td className="fw-semibold">#{r.id}</td>
                        <td>{r.employee_name || r.employee_id}</td>
                        <td>{r.position_id}</td>
                        <td>{r.district}</td>
                        <td>{r.request_type}</td>
                        <td>{r.requested_by}</td>
                        <td>
                          {proposed ? (
                            <div className="proposed-edits-box" style={{ fontSize: '12px' }}>
                              <strong className="text-warning">Pending Final Approval:</strong>
                              <ul className="m-0 ps-3">
                                {Object.entries(proposed).map(([k, v]) => (
                                  <li key={k}>
                                    <span className="text-muted">{k.replace('_', ' ')}:</span> <strong>{v}</strong>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="text-truncate" style={{ maxWidth: '200px' }} title={r.comments || r.subject}>
                              {r.comments || r.subject}
                            </div>
                          )}
                        </td>
                        <td>{isPendingFinal ? 'Awaiting Final Review' : r.status}</td>
                        <td>
                          {new Date(r.created_at).toLocaleDateString()} ({formatRelativeAge(r.created_at)})
                        </td>
                        <td>
                          {!(user?.is_view_admin === 1 || user?.is_view_admin === true) ? (
                            <div className="action-btns">
                              {isPendingFinal ? (
                                <>
                                  <button 
                                    className="btn btn-sm btn-approve"
                                    onClick={() => handleFinalApproval(r.id, true)}
                                    title="Approve and Save to DB"
                                  >
                                    <i className="fa-solid fa-check-double"></i> Final Approve
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-reject"
                                    onClick={() => handleFinalApproval(r.id, false)}
                                    title="Discard Changes"
                                  >
                                    <i className="fa-solid fa-trash-can"></i> Discard
                                  </button>
                                </>
                              ) : r.status === 'PENDING' ? (
                                <>
                                  <button 
                                    className="btn btn-sm btn-approve"
                                    onClick={() => handleApproveClick(r)}
                                    title="Approve & Grant Permission"
                                  >
                                    <i className="fa-solid fa-circle-check"></i> Approve
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-reject"
                                    onClick={() => handleRejectClick(r)}
                                    title="Reject"
                                  >
                                    <i className="fa-solid fa-circle-xmark"></i> Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '11px' }}>Processed</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '11px' }}>Read-only</span>
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

      {/* Grant Permissions Modal */}
      {showPermissionModal && (
        <ColumnPermissionModal 
          request={selectedRequest} 
          onClose={() => setShowPermissionModal(false)}
          onSubmit={handleApproveSubmit}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h5 className="modal-title">Reject Request</h5>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  State the reason for rejecting Request #{selectedRequest?.id}.
                </p>
                <div className="form-group mt-3">
                  <label className="form-label" htmlFor="reject_reason">Reason for Rejection</label>
                  <textarea 
                    id="reject_reason"
                    className="form-control-custom" 
                    rows="3" 
                    value={rejectComments} 
                    onChange={(e) => setRejectComments(e.target.value)} 
                    placeholder="Enter reason..."
                    required
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger-custom btn-sm">
                  Reject Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

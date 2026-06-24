import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { sendAwarenessEmail } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function AwarenessMail() {
  const [keyContent, setKeyContent] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [recipientType, setRecipientType] = useState('ALL'); // 'ALL' or 'SPECIFIC'
  const [csvFile, setCsvFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!keyContent.trim() || !description.trim()) {
      toast.error('Both Key Content and Description are required.');
      return;
    }
    if (recipientType === 'SPECIFIC' && !csvFile) {
      toast.error('Please upload a CSV file containing recipient email addresses.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('keyContent', keyContent.trim());
      formData.append('description', description.trim());
      formData.append('recipientType', recipientType);
      if (file) {
        formData.append('file', file);
      }
      if (recipientType === 'SPECIFIC' && csvFile) {
        formData.append('csvFile', csvFile);
      }
      if (scheduledDate) {
        formData.append('scheduledDate', scheduledDate);
      }

      const res = await sendAwarenessEmail(formData);
      toast.success(res.data.message || 'Awareness mail campaign started!');
      setKeyContent('');
      setDescription('');
      setFile(null);
      setScheduledDate('');
      setRecipientType('ALL');
      setCsvFile(null);
      
      // Clear file input DOM elements
      const fileInput = document.getElementById('file');
      if (fileInput) {
        fileInput.value = '';
      }
      const csvFileInput = document.getElementById('csvFile');
      if (csvFileInput) {
        csvFileInput.value = '';
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to dispatch awareness mail campaign.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="TNEB EEMS – Cybersecurity Awareness Mail">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Broadcast Security Awareness</h4>
          <p className="page-subtitle">Draft a custom security bulletin to be dispatched immediately to all active employees.</p>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header py-3 bg-light border-bottom">
              <h5 className="card-title mb-0" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Compose Security Awareness Mail
              </h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="keyContent" className="form-label fw-bold" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                    Key Content (Topic / Subject) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="keyContent"
                    className="form-control"
                    style={{ 
                      height: '45px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)', 
                      paddingLeft: '15px',
                      background: 'var(--bg-body)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="e.g. Shield Your Accounts with Strong Passwords"
                    value={keyContent}
                    onChange={(e) => setKeyContent(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="description" className="form-label fw-bold" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                    Description / Message Details <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    id="description"
                    className="form-control"
                    rows="8"
                    style={{ 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)', 
                      padding: '15px',
                      background: 'var(--bg-body)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="Provide full description and details about the awareness point..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                    required
                  ></textarea>
                </div>

                <div className="mb-4">
                  <label htmlFor="file" className="form-label fw-bold" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                    Attachment File (Optional)
                  </label>
                  <input
                    type="file"
                    id="file"
                    className="form-control"
                    style={{ 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)', 
                      background: 'var(--bg-body)',
                      color: 'var(--text-primary)',
                      padding: '10px'
                    }}
                    onChange={(e) => setFile(e.target.files[0] || null)}
                    disabled={loading}
                  />
                  <small className="text-muted mt-1 d-block">
                    Select a document, image, or PDF file to attach to the broadcast email.
                  </small>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                    Target Recipients <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="d-flex gap-4 mt-2">
                    <div className="form-check">
                      <input
                        type="radio"
                        id="targetAll"
                        name="recipientType"
                        className="form-check-input"
                        checked={recipientType === 'ALL'}
                        onChange={() => setRecipientType('ALL')}
                        disabled={loading}
                      />
                      <label className="form-check-label text-secondary" htmlFor="targetAll" style={{ fontSize: '14px', cursor: 'pointer', paddingLeft: '4px' }}>
                        All Active Employees
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        type="radio"
                        id="targetSpecific"
                        name="recipientType"
                        className="form-check-input"
                        checked={recipientType === 'SPECIFIC'}
                        onChange={() => setRecipientType('SPECIFIC')}
                        disabled={loading}
                      />
                      <label className="form-check-label text-secondary" htmlFor="targetSpecific" style={{ fontSize: '14px', cursor: 'pointer', paddingLeft: '4px' }}>
                        Specific Employees Only (Upload CSV / Excel)
                      </label>
                    </div>
                  </div>
                </div>

                {recipientType === 'SPECIFIC' && (
                  <div className="mb-4">
                    <label htmlFor="csvFile" className="form-label fw-bold" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                      Recipient List File (CSV / Excel) <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="file"
                      id="csvFile"
                      accept=".csv, .xlsx, .xls"
                      className="form-control"
                      style={{ 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-body)',
                        color: 'var(--text-primary)',
                        padding: '10px'
                      }}
                      onChange={(e) => setCsvFile(e.target.files[0] || null)}
                      disabled={loading}
                      required
                    />
                    <small className="text-muted mt-1 d-block">
                      Select a CSV or Excel file (.xlsx, .xls) containing employee email addresses to target.
                    </small>
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="scheduledDate" className="form-label fw-bold" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                    Send Schedule (Optional)
                  </label>
                  <input
                    type="date"
                    id="scheduledDate"
                    className="form-control"
                    style={{ 
                      height: '45px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)', 
                      paddingLeft: '15px',
                      background: 'var(--bg-body)',
                      color: 'var(--text-primary)'
                    }}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    disabled={loading}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <small className="text-muted mt-1 d-block">
                    Select a future date to schedule this campaign. Leave blank to send immediately.
                  </small>
                </div>

                <div className="text-end mt-4">
                  <button
                    type="submit"
                    className="btn-primary-custom"
                    style={{ height: '42px', padding: '0 24px', borderRadius: '8px' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin me-2"></i>
                        {scheduledDate ? 'Scheduling Campaign...' : 'Sending Broadcast...'}
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane me-2"></i>
                        {scheduledDate ? 'Schedule Campaign' : 'Send Broadcast to Employees'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

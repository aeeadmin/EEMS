import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function RequestDialog({ employee, initialField, onClose, onSubmit }) {
  const [requestType, setRequestType] = useState('EDIT_REQUEST');
  const [fieldName, setFieldName] = useState('phone_number');
  const [currentValue, setCurrentValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [subject, setSubject] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (employee) {
      if (initialField) {
        setRequestType('EDIT_REQUEST');
        setFieldName(initialField);
        setCurrentValue(employee[initialField] || '');
      } else {
        setRequestType('CORRECTION'); // default for action-level request button
      }
    }
  }, [employee, initialField]);

  // Update currentValue when fieldName changes
  useEffect(() => {
    if (employee && requestType === 'EDIT_REQUEST') {
      setCurrentValue(employee[fieldName] || '');
    }
  }, [fieldName, requestType, employee]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (requestType === 'EDIT_REQUEST') {
      if (fieldName === 'designation_email' && !newValue.toLowerCase().endsWith('@tnebnet.org')) {
        toast.error('Designation email must end with @tnebnet.org');
        return;
      }
      if (fieldName === 'name_based_email' && !newValue.toLowerCase().endsWith('@tnebltd.org')) {
        toast.error('Name Based email must end with @tnebltd.org');
        return;
      }
    }
    
    const data = {
      employee_id: employee.employee_id,
      position_id: employee.position_id,
      request_type: requestType,
      subject: requestType === 'EDIT_REQUEST' ? `Request to edit ${fieldName.replace('_', ' ')}` : subject,
      comments: requestType === 'EDIT_REQUEST' ? `Proposed change for ${fieldName.replace('_', ' ')}` : comments,
      field_name: fieldName,
      current_value: currentValue,
      new_value: newValue,
      designation_email: employee.designation_email
    };

    onSubmit(data);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-lg">
        <div className="modal-header">
          <h5 className="modal-title">
            {initialField ? 'Submit Edit Request (Inline)' : 'Submit General Administrative Request'}
          </h5>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6 form-group">
                <label className="form-label">Employee Name</label>
                <input 
                  type="text" 
                  className="form-control-custom" 
                  value={employee?.name || ''} 
                  disabled 
                />
              </div>
              <div className="col-md-6 form-group">
                <label className="form-label">Position ID</label>
                <input 
                  type="text" 
                  className="form-control-custom" 
                  value={employee?.position_id || ''} 
                  disabled 
                />
              </div>
            </div>

            {initialField ? (
              // Inline edit dialog layout
              <>
                <div className="form-group mt-3">
                  <label className="form-label">Select Field to Edit</label>
                  <select 
                    className="form-control-custom" 
                    value={fieldName} 
                    onChange={(e) => setFieldName(e.target.value)}
                  >
                    <option value="phone_number">Phone Number</option>
                    <option value="name_based_email">Name Based Email</option>
                    <option value="designation_email">Designation Email</option>
                  </select>
                </div>

                <div className="row mt-3">
                  <div className="col-md-6 form-group">
                    <label className="form-label">Current Value</label>
                    <input 
                      type="text" 
                      className="form-control-custom" 
                      value={currentValue} 
                      disabled 
                    />
                  </div>
                  <div className="col-md-6 form-group">
                    <label className="form-label">Requested Value <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control-custom" 
                      value={newValue} 
                      onChange={(e) => setNewValue(e.target.value)} 
                      required 
                      placeholder={`Enter new ${fieldName.replace('_', ' ')}`}
                    />
                  </div>
                </div>
              </>
            ) : (
              // General request dialog layout
              <>
                <div className="form-group mt-3">
                  <label className="form-label">Request Type</label>
                  <select 
                    className="form-control-custom" 
                    value={requestType} 
                    onChange={(e) => setRequestType(e.target.value)}
                  >
                    <option value="CORRECTION">Correction Request</option>
                    <option value="PERMISSION">Permission Request</option>
                    <option value="GENERAL">General Administrative Request</option>
                  </select>
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Subject <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control-custom" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    required 
                    placeholder="Enter subject of request"
                  />
                </div>

                <div className="form-group mt-3">
                  <label className="form-label">Request Message / Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea 
                    className="form-control-custom" 
                    rows="4" 
                    value={comments} 
                    onChange={(e) => setComments(e.target.value)} 
                    required 
                    placeholder="Provide detailed description of administrative request..."
                  ></textarea>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline-custom btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary-custom btn-sm">
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

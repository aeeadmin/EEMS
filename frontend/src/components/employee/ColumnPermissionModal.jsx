import { useState } from 'react';

export default function ColumnPermissionModal({ request, onClose, onSubmit }) {
  const [phoneSelected, setPhoneSelected] = useState(true);
  const [nameBasedEmailSelected, setNameBasedEmailSelected] = useState(true);
  const [desigEmailSelected, setDesigEmailSelected] = useState(true);
  const [comments, setComments] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const editableColumns = [];
    if (phoneSelected) editableColumns.push('phone_number');
    if (nameBasedEmailSelected) editableColumns.push('name_based_email');
    if (desigEmailSelected) editableColumns.push('designation_email');

    onSubmit({ editableColumns, comments });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h5 className="modal-title">Grant Column Edit Permission</h5>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="text-secondary" style={{ fontSize: '13px', marginBottom: '16px' }}>
              Select which columns the manager is permitted to edit for Employee <strong>{request?.employee_name || request?.employee_id}</strong>.
            </p>

            <div className="checkbox-group">
              <div className="checkbox-item">
                <input 
                  type="checkbox" 
                  id="perm_phone" 
                  checked={phoneSelected} 
                  onChange={(e) => setPhoneSelected(e.target.checked)} 
                />
                <label htmlFor="perm_phone">Phone Number</label>
              </div>

              <div className="checkbox-item">
                <input 
                  type="checkbox" 
                  id="perm_personal" 
                  checked={nameBasedEmailSelected} 
                  onChange={(e) => setNameBasedEmailSelected(e.target.checked)} 
                />
                <label htmlFor="perm_personal">Name Based Email</label>
              </div>

              <div className="checkbox-item">
                <input 
                  type="checkbox" 
                  id="perm_desig" 
                  checked={desigEmailSelected} 
                  onChange={(e) => setDesigEmailSelected(e.target.checked)} 
                />
                <label htmlFor="perm_desig">Designation Email</label>
              </div>
            </div>

            <div className="form-group mt-4">
              <label className="form-label" htmlFor="perm_comments">Comments / Approval Notes</label>
              <textarea 
                id="perm_comments"
                className="form-control-custom" 
                rows="3" 
                value={comments} 
                onChange={(e) => setComments(e.target.value)} 
                placeholder="Enter approval comments..."
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline-custom btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary-custom btn-sm">
              Approve & Grant Permission
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

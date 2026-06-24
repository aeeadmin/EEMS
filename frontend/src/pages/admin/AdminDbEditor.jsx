import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getDbTables, getDbTableData, updateDbTableRow } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDbEditor() {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentRow, setCurrentRow] = useState(null);
  const [editForm, setEditForm] = useState({});

  const loadTables = async () => {
    try {
      const res = await getDbTables();
      setTables(res.data.tables);
      if (res.data.tables.length > 0) {
        setSelectedTable(res.data.tables[0]);
      }
    } catch (err) {
      toast.error('Failed to load database tables');
    }
  };

  const loadTableData = async (tableName) => {
    if (!tableName) return;
    setLoading(true);
    try {
      const res = await getDbTableData(tableName);
      setColumns(res.data.columns);
      setRows(res.data.rows);
    } catch (err) {
      toast.error(`Failed to load data for table: ${tableName}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
      setSearchQuery('');
    }
  }, [selectedTable]);

  const filteredRows = rows.filter(row => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return Object.keys(row).some(key => {
      let val = row[key];
      if (val === null || val === undefined) return false;
      if (typeof val === 'object') {
        return JSON.stringify(val).toLowerCase().includes(query);
      }
      return val.toString().toLowerCase().includes(query);
    });
  });

  const handleEditClick = (row) => {
    setCurrentRow(row);
    // Prepopulate editForm with current row's values (converting objects/JSON to strings)
    const formValues = {};
    columns.forEach(col => {
      let val = row[col.name];
      const isColDate = col.type && col.type.toLowerCase() === 'date';
      if (val !== null && isColDate) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          formValues[col.name] = `${year}-${month}-${day}`;
        } else {
          formValues[col.name] = val.toString();
        }
      } else if (val !== null && typeof val === 'object') {
        formValues[col.name] = JSON.stringify(val);
      } else {
        formValues[col.name] = val !== null ? val : '';
      }
    });
    setEditForm(formValues);
    setShowEditModal(true);
  };

  const handleInputChange = (colName, value) => {
    setEditForm(prev => ({
      ...prev,
      [colName]: value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updates = {};
      columns.forEach(col => {
        if (col.name === 'id' || col.name === 'created_at' || col.name === 'updated_at') return; // Do not edit ID or timestamps
        
        let value = editForm[col.name];
        
        // Handle Null values
        if (value === '' && col.nullable) {
          updates[col.name] = null;
          return;
        }

        // Try to parse JSON strings back to objects for JSON columns
        if (col.type.toLowerCase().includes('json')) {
          try {
            updates[col.name] = JSON.parse(value);
          } catch(e) {
            updates[col.name] = value;
          }
        } else {
          updates[col.name] = value;
        }
      });

      await updateDbTableRow(selectedTable, {
        id: currentRow.id,
        updates
      });

      toast.success('Database row updated successfully');
      setShowEditModal(false);
      loadTableData(selectedTable);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update row');
    }
  };

  return (
    <Layout title="TNEB EEMS – Direct DB Editor">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Direct Database Editor</h4>
          <p className="page-subtitle" style={{ color: 'var(--danger)', fontWeight: '600' }}>
            ⚠️ WARNING: Direct modifications bypass application validation. Execute changes with absolute caution.
          </p>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="search-wrapper">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search table rows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <label className="form-label m-0 fw-bold" htmlFor="table-select">Select Table:</label>
            <select 
              id="table-select"
              className="filter-select" 
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              {tables.map((tbl, idx) => (
                <option key={idx} value={tbl}>{tbl}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="table-scroll" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table className="m-0">
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx}>{col.name}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center py-4 text-secondary">
                      No records found in table: {selectedTable}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      {columns.map((col, cIdx) => {
                        const val = row[col.name];
                        let renderedVal = '';
                        const isColDate = col.type && col.type.toLowerCase() === 'date';
                        if (val === null) {
                          renderedVal = <em className="text-muted">NULL</em>;
                        } else if (isColDate) {
                          const d = new Date(val);
                          if (!isNaN(d.getTime())) {
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            renderedVal = `${year}-${month}-${day}`;
                          } else {
                            renderedVal = val.toString();
                          }
                        } else if (typeof val === 'object') {
                          renderedVal = <code style={{ fontSize: '11px' }}>{JSON.stringify(val)}</code>;
                        } else if (typeof val === 'boolean') {
                          renderedVal = val ? 'true' : 'false';
                        } else if (col.name === 'password' || col.name === 'password_hash') {
                          renderedVal = '********';
                        } else {
                          renderedVal = val.toString();
                        }

                        return <td key={cIdx}>{renderedVal}</td>;
                      })}
                      <td>
                        {!(user?.is_view_admin === 1 || user?.is_view_admin === true) ? (
                          <button 
                            className="btn btn-sm btn-edit" 
                            onClick={() => handleEditClick(row)}
                            title="Edit Row Directly"
                          >
                            <i className="fa-solid fa-pen-to-square"></i> Edit
                          </button>
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
      </div>

      {/* Direct Row Editor Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-lg" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h5 className="modal-title">
                Direct DB Editor: Update Table <code style={{ color: 'var(--primary)' }}>{selectedTable}</code> (ID: {currentRow?.id})
              </h5>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div className="row g-3">
                  {columns.map((col, idx) => {
                    if (col.name === 'id' || col.name === 'created_at' || col.name === 'updated_at') return null; // Read-only columns

                    const isJson = col.type.toLowerCase().includes('json');
                    const isDate = col.type.toLowerCase().includes('date') && !col.type.toLowerCase().includes('time');

                    return (
                      <div className="col-md-6 form-group" key={idx}>
                        <label className="form-label" htmlFor={`field-${col.name}`}>
                          {col.name} <small className="text-muted">({col.type})</small>
                          {col.nullable && <small style={{ color: 'var(--success)' }}> (optional)</small>}
                        </label>
                        {isJson ? (
                          <textarea
                            id={`field-${col.name}`}
                            className="form-control-custom"
                            rows="2"
                            value={editForm[col.name] || ''}
                            onChange={(e) => handleInputChange(col.name, e.target.value)}
                            placeholder='{"key": "value"}'
                            required={!col.nullable}
                          />
                        ) : isDate ? (
                          <input
                            id={`field-${col.name}`}
                            type="date"
                            className="form-control-custom"
                            value={editForm[col.name] ? editForm[col.name].substring(0, 10) : ''}
                            onChange={(e) => handleInputChange(col.name, e.target.value)}
                            required={!col.nullable}
                          />
                        ) : (
                          <input
                            id={`field-${col.name}`}
                            type="text"
                            className="form-control-custom"
                            value={editForm[col.name] || ''}
                            onChange={(e) => handleInputChange(col.name, e.target.value)}
                            required={!col.nullable}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger-custom btn-sm" style={{ background: 'var(--danger)', color: '#fff' }}>
                  Commit Updates to DB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

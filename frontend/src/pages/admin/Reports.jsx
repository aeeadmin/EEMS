import Layout from '../../components/layout/Layout';
import { exportData } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Reports() {

  const handleExport = async (type, format) => {
    try {
      const res = await exportData(type, format);
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${type.charAt(0).toUpperCase() + type.slice(1)}_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      toast.success(`Exported ${type} as ${format.toUpperCase()} successfully`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const reports = [
    {
      type: 'employees',
      title: 'Employees Directory Report',
      description: 'Export all employee profiles, personal contact details, assigned districts, and designation email mappings.',
      icon: 'fa-users text-primary'
    },
    {
      type: 'requests',
      title: 'Workflow Requests Report',
      description: 'Export the complete log of mapping requests, status updates, column approval histories, and comments.',
      icon: 'fa-envelope-open-text text-warning'
    },
    {
      type: 'managers',
      title: 'Managers Directory Report',
      description: 'Export managers account associations, district assignments, email addresses, and login profile details.',
      icon: 'fa-user-tie text-success'
    },
    {
      type: 'admins',
      title: 'Administrators Directory Report',
      description: 'Export administrators user data, token mapping, district allocations, and active system profiles.',
      icon: 'fa-user-shield text-danger'
    }
  ];

  return (
    <Layout title="TNEB EEMS – Data Export Reports">
      <Toaster position="top-right" />

      <div className="page-header">
        <div>
          <h4 className="page-title">Enterprise Reports Export Center</h4>
          <p className="page-subtitle">Export official HRMS data formats directly to Microsoft Excel spreadsheets or raw CSV tables.</p>
        </div>
      </div>

      <div className="row g-4">
        {reports.map((rep, idx) => (
          <div key={idx} className="col-md-6">
            <div className="export-card">
              <div className="export-card-icon">
                <i className={`fa-solid ${rep.icon}`}></i>
              </div>
              <h6>{rep.title}</h6>
              <p>{rep.description}</p>
              <div className="export-btns">
                <button 
                  onClick={() => handleExport(rep.type, 'excel')} 
                  className="btn btn-primary-custom btn-sm"
                >
                  <i className="fa-solid fa-file-excel"></i> Export as Excel
                </button>
                <button 
                  onClick={() => handleExport(rep.type, 'csv')} 
                  className="btn btn-outline-custom btn-sm"
                >
                  <i className="fa-solid fa-file-csv"></i> Export as CSV
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

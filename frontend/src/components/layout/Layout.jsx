import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, title }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`main-content ${collapsed ? 'expanded' : ''}`}>
        <Header title={title} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

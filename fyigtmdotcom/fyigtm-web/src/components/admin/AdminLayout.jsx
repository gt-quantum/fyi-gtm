import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import ConfigEditor from './ConfigEditor';
import TopicsManager from './TopicsManager';
import TechManager from './TechManager';
import TipsManager from './TipsManager';
import RunsHistory from './RunsHistory';
import ToolConfigEditor from './ToolConfigEditor';
import ToolDraftsManager from './ToolDraftsManager';

const TABS = [
  { id: 'config', label: 'Newsletter Config' },
  { id: 'topics', label: 'Topics' },
  { id: 'tech', label: 'Tech Backlog' },
  { id: 'tips', label: 'Tips Backlog' },
  { id: 'runs', label: 'Run History' },
  { id: 'tool-config', label: 'Tool Config' },
  { id: 'tool-drafts', label: 'Tool Drafts' },
];

export default function AdminLayout() {
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('config');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    if (storedToken) {
      try {
        const decoded = JSON.parse(atob(storedToken));
        if (decoded.expiry > Date.now()) {
          setToken(storedToken);
        } else {
          localStorage.removeItem('admin_token');
        }
      } catch {
        localStorage.removeItem('admin_token');
      }
    }
    setChecking(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (checking) {
    return <div className="admin-loading">Loading...</div>;
  }

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'config':
        return <ConfigEditor token={token} />;
      case 'topics':
        return <TopicsManager token={token} />;
      case 'tech':
        return <TechManager token={token} />;
      case 'tips':
        return <TipsManager token={token} />;
      case 'runs':
        return <RunsHistory token={token} />;
      case 'tool-config':
        return <ToolConfigEditor token={token} />;
      case 'tool-drafts':
        return <ToolDraftsManager token={token} />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <h1 className="admin-title">Newsletter Admin</h1>
        <button className="logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </header>

      <nav className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="admin-content">{renderContent()}</main>
    </div>
  );
}

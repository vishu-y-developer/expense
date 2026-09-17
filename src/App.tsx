import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { BottomNav, Sidebar } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { History } from './pages/History';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { AddTransaction } from './pages/AddTransaction';
import { DayView } from './pages/DayView';

function Shell() {
  const { loading } = useApp();
  const location = useLocation();
  const isFullScreenRoute = location.pathname === '/add';

  if (loading) {
    return <div className="loading-screen">Loading your data...</div>;
  }

  return (
    <div className="app-shell">
      {!isFullScreenRoute && <Sidebar />}
      <div className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/day/:date" element={<DayView />} />
        </Routes>
        {!isFullScreenRoute && <BottomNav />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  );
}

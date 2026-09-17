import { NavLink, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const NAV_ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export function BottomNav() {
  const navigate = useNavigate();
  return (
    <>
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">
              <Icon name={item.icon} size={19} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="fab" aria-label="Add transaction" onClick={() => navigate('/add')}>
        <Icon name="plus" size={24} weight="bold" />
      </button>
    </>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          <Icon name="wallet" size={16} weight="fill" />
        </span>
        Money
      </div>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">
            <Icon name={item.icon} size={18} />
          </span>
          {item.label}
        </NavLink>
      ))}
      <div className="sidebar-add">
        <button className="btn" onClick={() => navigate('/add?type=expense')}>
          + Add Expense
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/add?type=earning')}>
          + Add Earning
        </button>
      </div>
    </aside>
  );
}

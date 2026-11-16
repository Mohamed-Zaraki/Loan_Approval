import type { View } from '../App';
import type { ManagerSession } from '../auth';
import { initials } from '../utils/format';
import { LogOut, LogoMark } from './Icons';

interface HeaderProps {
  view: View;
  onNavigate: (view: View) => void;
  manager: ManagerSession | null;
  onSignOut: () => void;
}

export function Header({ view, onNavigate, manager, onSignOut }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <button
          type="button"
          className="brand"
          onClick={() => onNavigate('landing')}
          aria-label="LoanFlow home"
        >
          <span className="brand-mark">
            <LogoMark size={20} />
          </span>
          <span className="brand-name">
            Loan<span>Flow</span>
          </span>
        </button>

        <nav className="main-nav" aria-label="Primary navigation">
          <button
            type="button"
            className={`nav-link ${view === 'client' ? 'active' : ''}`}
            onClick={() => onNavigate('client')}
            aria-current={view === 'client' ? 'page' : undefined}
          >
            Client portal
          </button>
          <button
            type="button"
            className={`nav-link ${view === 'manager' ? 'active' : ''}`}
            onClick={() => onNavigate('manager')}
            aria-current={view === 'manager' ? 'page' : undefined}
          >
            Manager console
          </button>
        </nav>

        <div className="header-meta">
          {manager && (
            <>
              <span className="header-divider" aria-hidden="true" />
              <div className="header-user">
                <span className="avatar avatar-sm tone-0">{initials(manager.name)}</span>
                <div className="header-user-text">
                  <span className="header-user-name">{manager.name}</span>
                  <span className="header-user-role">Bank manager</span>
                </div>
                <button
                  type="button"
                  className="signout-btn"
                  onClick={onSignOut}
                  title="Sign out"
                >
                  <LogOut size={15} />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

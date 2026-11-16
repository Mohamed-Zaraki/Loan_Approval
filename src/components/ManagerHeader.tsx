import type { ManagerSession } from '../auth';
import { initials } from '../utils/format';
import { Bank, LogOut } from './Icons';
import { Brand } from './Brand';

interface ManagerHeaderProps {
  manager: ManagerSession | null;
  onHome: () => void;
  onSignOut: () => void;
}

export function ManagerHeader({ manager, onHome, onSignOut }: ManagerHeaderProps) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand onClick={onHome} label="LoanFlow manager console" />
        <div className="header-meta">
          {manager ? (
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
          ) : (
            <span className="portal-tag">
              <Bank size={13} /> Manager console
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

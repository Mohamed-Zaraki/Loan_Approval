import { useEffect, useState } from 'react';
import type { ManagerSession } from './auth';
import { getManagerSession, signOutManager } from './auth';
import { PublicHeader } from './components/PublicHeader';
import { ClientHeader } from './components/ClientHeader';
import { ManagerHeader } from './components/ManagerHeader';
import { LandingPage } from './pages/LandingPage';
import { ClientPage } from './pages/ClientPage';
import { AdminPage } from './pages/AdminPage';
import { ManagerLoginPage } from './pages/ManagerLoginPage';

export type View = 'landing' | 'client' | 'manager';

const PATHS: Record<View, string> = {
  landing: '/',
  client: '/client',
  manager: '/manager',
};

const TITLES: Record<View, string> = {
  landing: 'LoanFlow — Loan approval platform',
  client: 'Apply for a loan · LoanFlow',
  manager: 'Manager console · LoanFlow',
};

function viewFromPath(): View {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/client') return 'client';
  if (path === '/manager' || path === '/admin') return 'manager';
  return 'landing';
}

export default function App() {
  const [view, setView] = useState<View>(viewFromPath);
  const [manager, setManager] = useState<ManagerSession | null>(() => getManagerSession());

  useEffect(() => {
    document.title = TITLES[view];
  }, [view]);

  useEffect(() => {
    // Keep old hash links working and redirect /admin to /manager.
    const legacyHash = window.location.hash.replace('#', '');
    if (legacyHash === 'client' || legacyHash === 'admin') {
      const next: View = legacyHash === 'client' ? 'client' : 'manager';
      window.history.replaceState(null, '', PATHS[next]);
      setView(next);
    } else if (window.location.pathname.replace(/\/+$/, '') === '/admin') {
      window.history.replaceState(null, '', PATHS.manager);
      setView('manager');
    }

    const onPopState = () => setView(viewFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(next: View) {
    setView(next);
    if (window.location.pathname !== PATHS[next]) {
      window.history.pushState(null, '', PATHS[next]);
    }
    window.scrollTo({ top: 0 });
  }

  function handleSignIn(session: ManagerSession) {
    setManager(session);
    navigate('manager');
  }

  function handleSignOut() {
    signOutManager();
    setManager(null);
    navigate('manager');
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div id="main-content" tabIndex={-1}>
        {view === 'landing' && (
          <>
            <PublicHeader onHome={() => navigate('landing')} />
            <LandingPage onNavigate={navigate} />
          </>
        )}

        {view === 'client' && (
          <>
            <ClientHeader onHome={() => navigate('client')} />
            <ClientPage />
          </>
        )}

        {view === 'manager' && (
          <>
            <ManagerHeader
              manager={manager}
              onHome={() => navigate('manager')}
              onSignOut={handleSignOut}
            />
            {manager ? (
              <AdminPage managerName={manager.name} />
            ) : (
              <ManagerLoginPage onSignIn={handleSignIn} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
<<<<<<< HEAD
  const [view, setView] = useState<View>(viewFromHash);
  const [manager, setManager] = useState<ManagerSession | null>(null);
  const [managerLoading, setManagerLoading] = useState(true);
=======
  const [view, setView] = useState<View>(viewFromPath);
  const [manager, setManager] = useState<ManagerSession | null>(() => getManagerSession());
>>>>>>> 8e86fe8da14e2e5d377795a55126b1d5c761c930

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

  useEffect(() => {
    let active = true;
    void getManagerSession().then((session) => {
      if (!active) return;
      setManager(session);
      setManagerLoading(false);
    });
    return () => {
      active = false;
    };
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

<<<<<<< HEAD
  async function handleSignOut() {
    try {
      await signOutManager();
    } catch {
      // Clear the local view even if the API is temporarily unavailable.
    } finally {
      setManager(null);
      navigate('admin');
    }
=======
  function handleSignOut() {
    signOutManager();
    setManager(null);
    navigate('manager');
>>>>>>> 8e86fe8da14e2e5d377795a55126b1d5c761c930
  }

  return (
    <div className="app">
<<<<<<< HEAD
      <Header
        view={view}
        onNavigate={navigate}
        manager={manager}
        onSignOut={handleSignOut}
      />
      {view === 'landing' && <LandingPage onNavigate={navigate} />}
      {view === 'client' && <ClientPage />}
      {view === 'admin' &&
        (managerLoading ? (
          <main className="page"><div className="container loading-panel"><span className="spinner" /> Checking manager session…</div></main>
        ) : manager ? (
          <AdminPage />
        ) : (
          <ManagerLoginPage onSignIn={handleSignIn} />
        ))}
=======
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
>>>>>>> 8e86fe8da14e2e5d377795a55126b1d5c761c930
    </div>
  );
}

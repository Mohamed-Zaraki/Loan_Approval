import { useEffect, useState } from 'react';
import type { ManagerSession } from './auth';
import { getManagerSession, signOutManager } from './auth';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { ClientPage } from './pages/ClientPage';
import { AdminPage } from './pages/AdminPage';
import { ManagerLoginPage } from './pages/ManagerLoginPage';

export type View = 'landing' | 'client' | 'admin';

function viewFromHash(): View {
  const hash = window.location.hash.replace('#', '');
  return hash === 'client' || hash === 'admin' ? hash : 'landing';
}

export default function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [manager, setManager] = useState<ManagerSession | null>(null);
  const [managerLoading, setManagerLoading] = useState(true);

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
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
    const url = next === 'landing' ? window.location.pathname : `${window.location.pathname}#${next}`;
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0 });
  }

  function handleSignIn(session: ManagerSession) {
    setManager(session);
    navigate('admin');
  }

  async function handleSignOut() {
    try {
      await signOutManager();
    } catch {
      // Clear the local view even if the API is temporarily unavailable.
    } finally {
      setManager(null);
      navigate('admin');
    }
  }

  return (
    <div className="app">
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
    </div>
  );
}

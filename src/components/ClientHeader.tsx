import { User } from './Icons';
import { Brand } from './Brand';

export function ClientHeader({ onHome }: { onHome: () => void }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand onClick={onHome} label="LoanFlow client portal" />
        <div className="header-meta">
          <span className="portal-tag">
            <User size={13} /> Client portal
          </span>
        </div>
      </div>
    </header>
  );
}

import { Brand } from './Brand';

export function PublicHeader({ onHome }: { onHome: () => void }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand onClick={onHome} label="LoanFlow home" />
        <div className="header-meta">
          <span className="portal-tag">Loan origination platform</span>
        </div>
      </div>
    </header>
  );
}

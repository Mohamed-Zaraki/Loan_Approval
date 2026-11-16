import { LogoMark } from './Icons';

export function Brand({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="brand" onClick={onClick} aria-label={label}>
      <span className="brand-mark">
        <LogoMark size={20} />
      </span>
      <span className="brand-name">
        Loan<span>Flow</span>
      </span>
    </button>
  );
}

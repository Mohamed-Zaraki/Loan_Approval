import type { View } from '../App';
import { ArrowRight, Check, FileText, ShieldCheck, User, Wallet } from '../components/Icons';

export function LandingPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <main className="landing">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Loan origination platform</span>
            <h1>
              Lending decisions, <em>made clear.</em>
            </h1>
            <p className="lede">
              One workspace where applicants submit loan requests and bank managers review,
              score, and decide — with every step on record.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => onNavigate('client')}
              >
                Start an application <ArrowRight size={17} />
              </button>
            </div>

            <div className="hero-points">
              <span className="hero-point">
                <Check size={15} /> Guided applications
              </span>
              <span className="hero-point">
                <ShieldCheck size={15} /> Policy-based scoring
              </span>
              <span className="hero-point">
                <FileText size={15} /> Decision audit trail
              </span>
            </div>
          </div>

          <div className="role-cards">
            <button
              type="button"
              className="role-card role-client"
              onClick={() => onNavigate('client')}
            >
              <span className="role-top">
                <span className="role-icon">
                  <User size={22} />
                </span>
              </span>
              <span className="role-kicker">For applicants</span>
              <h2>Client portal</h2>
              <p>
                Complete your profile, request an amount and duration, and follow your
                application from submission to decision.
              </p>
              <span className="role-action">
                Start an application
                <span className="role-arrow">
                  <ArrowRight size={15} />
                </span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="container feature-strip" aria-label="Platform capabilities">
        <div className="feature">
          <span className="feature-icon">
            <FileText size={18} />
          </span>
          <div>
            <h3>Structured intake</h3>
            <p>Applicant, income and loan data captured in one guided flow.</p>
          </div>
        </div>
        <div className="feature">
          <span className="feature-icon">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h3>Transparent scoring</h3>
            <p>Debt ratio, repayment history and stability checks shown up front.</p>
          </div>
        </div>
        <div className="feature">
          <span className="feature-icon">
            <Wallet size={18} />
          </span>
          <div>
            <h3>Documented decisions</h3>
            <p>Every approval or denial keeps a reason, manager and timestamp.</p>
          </div>
        </div>
      </section>

      <footer className="container landing-foot">
        <span>
          <span className="brand-dot" /> LoanFlow — loan origination platform
        </span>
        <span>Every decision recorded with a reason and timestamp</span>
      </footer>
    </main>
  );
}

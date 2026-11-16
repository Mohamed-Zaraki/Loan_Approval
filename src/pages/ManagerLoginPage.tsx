import { useState } from 'react';
import type { FormEvent } from 'react';
import { signInManager } from '../auth';
import type { ManagerSession } from '../auth';
import { Field, TextInput } from '../components/Fields';
import {
  AlertTriangle,
  ArrowRight,
  Bank,
  Check,
  ShieldCheck,
} from '../components/Icons';

export function ManagerLoginPage({
  onSignIn,
}: {
  onSignIn: (session: ManagerSession) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setError(null);
    setSubmitting(true);

<<<<<<< HEAD
=======
    // Small delay to mirror a network round trip.
    await new Promise((resolve) => window.setTimeout(resolve, 450));

>>>>>>> 8e86fe8da14e2e5d377795a55126b1d5c761c930
    try {
      const session = await signInManager(email, password);
      onSignIn(session);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Could not sign in.');
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="container login-grid">
        <aside className="login-aside">
          <span className="login-aside-kicker">
            <Bank size={15} /> Bank manager access
          </span>
          <h2>
            Decisions need context.
            <br />
            Start with a secure sign-in.
          </h2>
          <p>
            The review queue contains applicants’ personal and financial information. Sign in to
            review files, assess eligibility and record a documented decision.
          </p>

          <ul className="login-points">
            <li>
              <Check size={14} /> Authorized managers only
            </li>
            <li>
              <Check size={14} /> Every decision keeps a reason and timestamp
            </li>
            <li>
              <Check size={14} /> Applicants see the final outcome, not internal notes
            </li>
          </ul>

          <div className="login-preview" aria-hidden="true">
            <div className="login-preview-head">
              <span>Review queue</span>
              <span className="login-preview-live">
                <i /> Live
              </span>
            </div>
            <div className="login-preview-row">
              <span className="login-preview-avatar">SM</span>
              <span className="login-preview-body">
                <strong>Sarah Mitchell</strong>
                <small>Personal loan · €25,000</small>
              </span>
              <span className="login-preview-badge pending">Pending</span>
            </div>
            <div className="login-preview-row">
              <span className="login-preview-avatar alt">YB</span>
              <span className="login-preview-body">
                <strong>Yassine Ben Ali</strong>
                <small>Home renovation · €12,000</small>
              </span>
              <span className="login-preview-badge approved">Approved</span>
            </div>
          </div>

          <div className="login-aside-note">
            <ShieldCheck size={16} />
<<<<<<< HEAD
            <span>Manager access is verified by the LoanFlow database API.</span>
=======
            <span>Your session ends when you sign out. Use manager access on trusted devices only.</span>
>>>>>>> 8e86fe8da14e2e5d377795a55126b1d5c761c930
          </div>
        </aside>

        <section className="panel login-card">
          <span className="eyebrow">Manager console</span>
          <h1>Sign in</h1>
          <p className="login-sub">Review applications and record approval decisions.</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <Field label="Email" htmlFor="managerEmail">
              <TextInput
                id="managerEmail"
                type="email"
                autoComplete="username"
                placeholder="manager@bank.com"
                value={email}
                invalid={Boolean(error)}
                autoFocus
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
              />
            </Field>

            <Field label="Password" htmlFor="managerPassword">
              <div className="password-wrap">
                <TextInput
                  id="managerPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  invalid={Boolean(error)}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError(null);
                  }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            {error && (
              <div className="error-box" role="alert">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
<<<<<<< HEAD

          <p className="login-footnote">
            <ShieldCheck size={13} /> Your manager account is stored in the database; passwords are
            verified by the backend.
          </p>
=======
>>>>>>> 8e86fe8da14e2e5d377795a55126b1d5c761c930
        </section>
      </div>
    </main>
  );
}

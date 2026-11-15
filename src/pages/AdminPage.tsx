import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api';
import { ApplicationDrawer } from '../components/ApplicationDrawer';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Close,
  FileText,
  Paperclip,
  Search,
  Wallet,
} from '../components/Icons';
import { StatusBadge } from '../components/StatusBadge';
import { Toast, useToast } from '../components/Toast';
import type { ApplicationStatus, DecisionInput, LoanApplication } from '../types';
import { assessLoan } from '../utils/loan';
import {
  avatarTone,
  formatCurrency,
  formatDate,
  formatIdNumber,
  formatPercent,
  initials,
  ratioTone,
  relativeTime,
} from '../utils/format';

type StatusFilter = 'all' | ApplicationStatus;
type SortOption = 'newest' | 'oldest' | 'amount';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'denied', label: 'Denied' },
];

export function AdminPage({ managerName }: { managerName: string }) {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setApplications(await api.listApplications());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      pending: applications.filter((application) => application.status === 'pending').length,
      approved: applications.filter((application) => application.status === 'approved').length,
      denied: applications.filter((application) => application.status === 'denied').length,
      volume: applications.reduce((total, application) => total + application.loanAmount, 0),
    }),
    [applications],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const result = applications.filter((application) => {
      if (statusFilter !== 'all' && application.status !== statusFilter) return false;
      if (!needle) return true;

      const haystack = [
        application.applicant.fullName,
        application.applicant.idCardNumber,
        application.applicationId,
        application.loanPurpose,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });

    return result.sort((a, b) => {
      if (sort === 'amount') return b.loanAmount - a.loanAmount;
      const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === 'oldest' ? -difference : difference;
    });
  }, [applications, statusFilter, query, sort]);

  const selected = applications.find((application) => application.applicationId === selectedId) ?? null;

  function countFor(filter: StatusFilter): number {
    if (filter === 'all') return applications.length;
    return applications.filter((application) => application.status === filter).length;
  }

  async function handleDecision(application: LoanApplication, input: DecisionInput) {
    const updated = await api.decideApplication(application.applicationId, input);
    setApplications((current) =>
      current.map((item) => (item.applicationId === updated.applicationId ? updated : item)),
    );
    show(
      input.status === 'approved'
        ? `${application.applicant.fullName}’s loan was approved.`
        : `${application.applicant.fullName}’s loan was denied.`,
      'success',
    );
    return updated;
  }

  return (
    <main className="page">
      <div className="container">
        <div className="page-head admin-head">
          <div>
            <span className="eyebrow">Manager console</span>
            <h1>Review queue</h1>
            <p>
              Every submitted request, its affordability indicators and the decision on record.
              Open a row to review the file.
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard
            label="Pending review"
            value={stats.pending}
            caption={stats.pending === 1 ? '1 file to review' : `${stats.pending} files to review`}
            icon={<Clock size={19} />}
            tone="amber"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            caption="Decisions on record"
            icon={<Check size={19} />}
            tone="green"
          />
          <StatCard
            label="Denied"
            value={stats.denied}
            caption="Decisions on record"
            icon={<Close size={19} />}
            tone="red"
          />
          <StatCard
            label="Requested volume"
            value={formatCurrency(stats.volume)}
            caption="Across all applications"
            icon={<Wallet size={19} />}
            tone="indigo"
          />
        </div>

        <div className="panel toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search name, ID, reference or purpose…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search applications"
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <Close size={13} />
              </button>
            )}
          </div>

          <div className="filter-tabs" role="group" aria-label="Filter by status">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={statusFilter === filter.id}
                className={`filter-tab ${statusFilter === filter.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
                <span className="count">{countFor(filter.id)}</span>
              </button>
            ))}
          </div>

          <label className="sort-select">
            Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount">Highest amount</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="panel loading-panel">
            <span className="spinner" /> Loading applications…
          </div>
        ) : loadError ? (
          <div className="panel empty-state">
            <div className="empty-icon">
              <Close size={24} />
            </div>
            <h3>Could not load applications</h3>
            <p>{loadError}</p>
            <button type="button" className="btn btn-primary" onClick={() => void load()}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel empty-state">
            <div className="empty-icon">
              <FileText size={24} />
            </div>
            <h3>No applications match</h3>
            <p>Adjust the search or status filter to see more files.</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setStatusFilter('all');
                setQuery('');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="panel table-wrap desktop-table">
              <table className="apps-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Reference</th>
                    <th>Purpose</th>
                    <th>Amount</th>
                    <th>Debt ratio</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((application) => {
                    const ratio = assessLoan(application).debtRatio;
                    return (
                      <tr
                        key={application.applicationId}
                        tabIndex={0}
                        onClick={() => setSelectedId(application.applicationId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedId(application.applicationId);
                          }
                        }}
                      >
                        <td>
                          <div className="person">
                            <span className={`avatar ${avatarTone(application.applicant.fullName)}`}>
                              {initials(application.applicant.fullName)}
                            </span>
                            <div>
                              <strong>{application.applicant.fullName}</strong>
                              <span className="cell-sub">
                                {formatIdNumber(application.applicant.idCardNumber)}
                                {application.incomeDocument && (
                                  <span className="doc-flag" title="Proof of income attached">
                                    <Paperclip size={10} /> doc
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="mono">{application.applicationId}</span>
                        </td>
                        <td>{application.loanPurpose}</td>
                        <td className="num">
                          <strong>{formatCurrency(application.loanAmount)}</strong>
                          <span className="cell-sub">{application.loanDuration} months</span>
                        </td>
                        <td>
                          <RatioPill ratio={ratio} />
                        </td>
                        <td>
                          <span className="cell-sub" title={formatDate(application.createdAt)}>
                            {relativeTime(application.createdAt)}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={application.status} />
                        </td>
                        <td>
                          <ChevronRight size={16} className="row-chevron" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-list">
              {filtered.map((application) => {
                const ratio = assessLoan(application).debtRatio;
                return (
                  <button
                    key={application.applicationId}
                    type="button"
                    className="panel app-card"
                    onClick={() => setSelectedId(application.applicationId)}
                  >
                    <div className="app-card-top">
                      <div className="person">
                        <span className={`avatar ${avatarTone(application.applicant.fullName)}`}>
                          {initials(application.applicant.fullName)}
                        </span>
                        <div>
                          <strong>{application.applicant.fullName}</strong>
                          <span className="cell-sub">
                            {application.applicationId}
                            {application.incomeDocument && (
                              <span className="doc-flag" title="Proof of income attached">
                                <Paperclip size={10} /> doc
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                    <div className="app-card-mid">
                      <span>{application.loanPurpose}</span>
                      <strong>{formatCurrency(application.loanAmount)}</strong>
                    </div>
                    <div className="app-card-bottom">
                      <span>
                        {application.loanDuration} months · <RatioPill ratio={ratio} />
                      </span>
                      <span className="link">
                        Review <ArrowRight size={14} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selected && (
        <ApplicationDrawer
          application={selected}
          managerName={managerName}
          onClose={() => setSelectedId(null)}
          onDecide={handleDecision}
        />
      )}

      <Toast toast={toast} onClose={dismiss} />
    </main>
  );
}

function StatCard({
  label,
  value,
  caption,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  caption: string;
  icon: ReactNode;
  tone: 'amber' | 'green' | 'red' | 'indigo';
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </div>
  );
}

function RatioPill({ ratio }: { ratio: number }) {
  return <span className={`ratio-pill ${ratioTone(ratio)}`}>{formatPercent(ratio)}</span>;
}

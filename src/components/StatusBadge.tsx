import type { ApplicationStatus } from '../types';
import { Clock, Check, Close } from './Icons';

const LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  denied: 'Denied',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-icon">
        {status === 'pending' ? (
          <Clock size={12} />
        ) : status === 'approved' ? (
          <Check size={12} />
        ) : (
          <Close size={12} />
        )}
      </span>
      {LABELS[status]}
    </span>
  );
}

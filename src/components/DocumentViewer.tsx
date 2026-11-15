import { useEffect, useState } from 'react';
import type { IncomeDocument } from '../types';
import {
  dataUrlToBlob,
  formatFileSize,
  isImageDocument,
  openIncomeDocument,
} from '../utils/documents';
import { formatDateTime } from '../utils/format';
import { Close, Eye, FileText } from './Icons';

interface DocumentViewerProps {
  document: IncomeDocument;
  onClose: () => void;
}

/**
 * In-app document preview. Data URLs cannot be navigated to directly in some
 * browsers, so the stored copy is converted to a blob URL and rendered inline.
 */
export function DocumentViewer({ document: incomeDocument, onClose }: DocumentViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const isImage = isImageDocument(incomeDocument);

  useEffect(() => {
    if (!incomeDocument.dataUrl) return;

    const url = URL.createObjectURL(dataUrlToBlob(incomeDocument.dataUrl));
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [incomeDocument]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="viewer-overlay" onMouseDown={onClose}>
      <div
        className="viewer"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${incomeDocument.name}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="viewer-head">
          <span className="viewer-icon">
            {isImage ? <Eye size={18} /> : <FileText size={18} />}
          </span>
          <div className="viewer-title">
            <strong title={incomeDocument.name}>{incomeDocument.name}</strong>
            <span>
              {formatFileSize(incomeDocument.size)} · uploaded{' '}
              {formatDateTime(incomeDocument.uploadedAt)}
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview">
            <Close size={17} />
          </button>
        </header>

        <div className={`viewer-body ${isImage ? 'image' : 'pdf'}`}>
          {objectUrl ? (
            isImage ? (
              <img
                src={objectUrl}
                alt={`Uploaded document: ${incomeDocument.name}`}
              />
            ) : (
              <iframe src={objectUrl} title={`Uploaded document: ${incomeDocument.name}`} />
            )
          ) : (
            <p className="viewer-empty">This record has no stored file to preview.</p>
          )}
        </div>

        <footer className="viewer-foot">
          <span>Uploaded by the applicant · review before deciding.</span>
          <div className="viewer-actions">
            {incomeDocument.dataUrl && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openIncomeDocument(incomeDocument)}
              >
                Open in new tab
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import type { IncomeDocument } from '../types';
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_ACCEPT_LABEL,
  formatFileSize,
  isImageDocument,
  openIncomeDocument,
  prepareIncomeDocument,
} from '../utils/documents';
import { formatDateTime } from '../utils/format';
import { AlertTriangle, Check, Close, FileText, Upload } from './Icons';

interface DocumentUploadProps {
  id: string;
  value: IncomeDocument | null;
  onChange: (document: IncomeDocument | null) => void;
  invalid?: boolean;
  hasCDI: boolean;
}

export function DocumentUpload({
  id,
  value,
  onChange,
  invalid = false,
  hasCDI,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;

    setBusy(true);
    setError(null);
    try {
      onChange(await prepareIncomeDocument(file));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Could not read the selected file.',
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  // Which document is expected depends on how the applicant earns their income.
  const guidance = hasCDI
    ? 'Employees: upload your last 3 payslips (fiches de paie) or a salary certificate (attestation de salaire) issued by your employer. A CNAS affiliation statement also works.'
    : 'Self-employed: upload your CASNOS affiliation certificate together with your latest tax notice (avis d’imposition). Retirees can upload their pension statement (attestation de retraite).';

  if (value) {
    return (
      <div className="document-field">
        <div className="doc-card">
          {isImageDocument(value) ? (
            <img src={value.dataUrl} alt="" className="doc-thumb" />
          ) : (
            <span className="doc-icon">
              <FileText size={20} />
            </span>
          )}

          <div className="doc-info">
            <strong className="doc-name" title={value.name}>
              {value.name}
            </strong>
            <span className="doc-meta">
              {formatFileSize(value.size)} · uploaded {formatDateTime(value.uploadedAt)}
            </span>
            <span className="doc-state">
              <Check size={12} /> Ready to submit
            </span>
          </div>

          <div className="doc-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => openIncomeDocument(value)}
            >
              View
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove document"
              onClick={() => onChange(null)}
            >
              <Close size={15} />
            </button>
          </div>
        </div>
        <span className="field-hint">{guidance}</span>
      </div>
    );
  }

  return (
    <div className="document-field">
      <label
        htmlFor={id}
        className={`dropzone ${dragging ? 'dragging' : ''} ${invalid || error ? 'invalid' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="dropzone-input"
          accept={DOCUMENT_ACCEPT}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            void handleFile(event.target.files?.[0])
          }
        />
        <span className="dropzone-icon">
          {busy ? <span className="spinner" /> : <Upload size={20} />}
        </span>
        <span className="dropzone-title">
          {busy ? 'Reading the document…' : 'Click to upload or drag a file here'}
        </span>
        <span className="dropzone-hint">{DOCUMENT_ACCEPT_LABEL}</span>
      </label>

      {(error || invalid) && (
        <span className="field-error">
          <AlertTriangle size={13} />
          {error ?? 'Upload a proof of income document.'}
        </span>
      )}

      <span className="field-hint">{guidance}</span>
    </div>
  );
}

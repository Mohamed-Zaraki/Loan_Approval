import {
  DOCUMENT_IMAGE_MAX_EDGE,
  MAX_DOCUMENT_BYTES,
  MAX_STORED_PDF_BYTES,
} from '../config';
import type { IncomeDocument } from '../types';

export const DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png';
export const DOCUMENT_ACCEPT_LABEL = 'PDF, JPG or PNG · up to 3 MB';

const PDF = 'application/pdf';
const JPEG = 'image/jpeg';
const PNG = 'image/png';

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read the image file.'));
    image.src = source;
  });
}

async function compressImage(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  const original = await readAsDataUrl(file);
  const image = await loadImage(original);
  const longestEdge = Math.max(image.width, image.height);
  const scale =
    longestEdge > DOCUMENT_IMAGE_MAX_EDGE ? DOCUMENT_IMAGE_MAX_EDGE / longestEdge : 1;

  if (scale === 1 && original.length < 600_000) {
    return { dataUrl: original, mimeType: file.type };
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) return { dataUrl: original, mimeType: file.type };

  // White background keeps transparent PNG scans readable once flattened to JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL(JPEG, 0.75), mimeType: JPEG };
}

export async function prepareIncomeDocument(file: File): Promise<IncomeDocument> {
  const isPdf = file.type === PDF;
  const isImage = file.type === JPEG || file.type === PNG;

  if (!isPdf && !isImage) {
    throw new Error('Upload the document as a PDF, JPG or PNG file.');
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `The file is larger than ${formatFileSize(MAX_DOCUMENT_BYTES)}. Upload a smaller scan or photo.`,
    );
  }

  if (isPdf) {
    if (file.size > MAX_STORED_PDF_BYTES) {
      throw new Error(
        'PDFs must be under 1.5 MB. Upload a compressed PDF or a photo of the document.',
      );
    }

    return {
      name: file.name,
      mimeType: PDF,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      dataUrl: await readAsDataUrl(file),
    };
  }

  const image = await compressImage(file);
  return {
    name: file.name,
    mimeType: image.mimeType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl: image.dataUrl,
  };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeType = /:(.*?);/.exec(header ?? '')?.[1] ?? 'application/octet-stream';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

export function isImageDocument(document: IncomeDocument): boolean {
  return document.mimeType.startsWith('image/') && Boolean(document.dataUrl);
}

/** Opens the stored copy in a new tab (data URLs cannot be navigated to directly). */
export function openIncomeDocument(document: IncomeDocument): void {
  if (!document.dataUrl) return;

  const url = URL.createObjectURL(dataUrlToBlob(document.dataUrl));
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

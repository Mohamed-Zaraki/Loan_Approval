import type {
  Applicant,
  ApplicationStatus,
  DecisionInput,
  LoanApplication,
  LoanApplicationInput,
} from '../types';

/**
 * Browser-only demo API.
 *
 * It mimics a REST backend so the whole interface can be explored without a
 * server. Set VITE_API_URL to switch to the real Python API (see src/api/index.ts).
 */

const STORAGE_KEY = 'loanflow.demo-applications.v3';
const LEGACY_STORAGE_KEY = 'loanflow.demo-applications.v2';
const DAY = 86_400_000;
const HOUR = 3_600_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function simulateLatency(): Promise<void> {
  return wait(180 + Math.random() * 220);
}

function uid(prefix: string): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}-${raw.toUpperCase()}`;
}

function readStore(): LoanApplication[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Carry over applications created before documents were previewable, and
      // give old seeded rows a generated sample file so the demo stays complete.
      const migrated = migrateLegacyStore();
      const applications = migrated ?? buildSeed();
      writeStore(applications);
      return applications;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LoanApplication[]) : [];
  } catch {
    return buildSeed();
  }
}

function migrateLegacyStore(): LoanApplication[] | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    return (parsed as LoanApplication[]).map((application) => {
      const incomeDocument = application.incomeDocument;
      if (!incomeDocument || incomeDocument.dataUrl) return application;

      return {
        ...application,
        incomeDocument: {
          ...incomeDocument,
          dataUrl: makeSampleDocumentDataUrl(
            application.applicant.fullName,
            incomeDocument.name,
          ),
        },
      };
    });
  } catch {
    return null;
  }
}

function writeStore(applications: LoanApplication[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch {
    throw new Error(
      'Storage is full. Remove an application and try again.',
    );
  }
}

function sortNewestFirst(applications: LoanApplication[]): LoanApplication[] {
  return [...applications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

interface SeedSpec {
  ref: string;
  applicantId: string;
  fullName: string;
  idCardNumber: string;
  age: number;
  job: string;
  hasCDI: boolean;
  isMarried: boolean;
  numberOfChildren: number;
  monthlyIncome: number;
  totalDebt: number;
  savings: number;
  incomeVerified: boolean;
  loanAmount: number;
  loanDuration: number;
  loanPurpose: string;
  missedPayments: number;
  createdAgo: number;
  status: ApplicationStatus;
  /** Seed applications carry a generated sample document so managers can preview the flow. */
  document?: { name: string; size: number };
  decision?: {
    reason: string;
    managerName: string;
    decidedAgo: number;
    decisionId: string;
  };
}

/**
 * Builds a tiny, valid one-page PDF so seeded applications have a document the
 * manager can actually open in the interface. ASCII only so `btoa` stays happy.
 */
function makeSampleDocumentDataUrl(applicantName: string, documentName: string): string {
  const escape = (text: string) => text.replace(/[\\()]/g, (match) => `\\${match}`);
  const lines = [
    'PROOF OF INCOME',
    `Applicant: ${applicantName}`,
    `Document: ${documentName}`,
    'Employer: Societe Exemple SARL',
    'Net monthly income: 92,000.00',
    'Period: October 2026',
    '',
    'Document provided in support of this application.',
  ];

  const content = [
    'BT',
    '/F1 18 Tf',
    '56 780 Td',
    `(${escape(lines[0])}) Tj`,
    '/F1 11 Tf',
    ...lines.slice(1).map((line) => `0 -26 Td (${escape(line)}) Tj`),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return `data:application/pdf;base64,${btoa(pdf)}`;
}

function makeSeedApplication(spec: SeedSpec, now: number): LoanApplication {
  const applicant: Applicant = {
    applicantId: spec.applicantId,
    fullName: spec.fullName,
    idCardNumber: spec.idCardNumber,
    age: spec.age,
    job: spec.job,
    hasCDI: spec.hasCDI,
    isMarried: spec.isMarried,
    numberOfChildren: spec.numberOfChildren,
  };

  return {
    applicationId: spec.ref,
    applicant,
    monthlyIncome: spec.monthlyIncome,
    totalDebt: spec.totalDebt,
    savings: spec.savings,
    incomeVerified: spec.incomeVerified,
    incomeDocument:
      spec.incomeVerified && spec.document
        ? {
            name: spec.document.name,
            mimeType: 'application/pdf',
            size: spec.document.size,
            uploadedAt: new Date(now - spec.createdAgo + 900_000).toISOString(),
            dataUrl: makeSampleDocumentDataUrl(spec.fullName, spec.document.name),
          }
        : null,
    loanAmount: spec.loanAmount,
    loanDuration: spec.loanDuration,
    loanPurpose: spec.loanPurpose,
    missedPayments: spec.missedPayments,
    status: spec.status,
    createdAt: new Date(now - spec.createdAgo).toISOString(),
    decision: spec.decision
      ? {
          decisionId: spec.decision.decisionId,
          status: spec.status === 'denied' ? 'denied' : 'approved',
          reason: spec.decision.reason,
          decisionDate: new Date(now - spec.decision.decidedAgo).toISOString(),
          managerName: spec.decision.managerName,
        }
      : null,
  };
}

function buildSeed(): LoanApplication[] {
  const now = Date.now();
  const year = new Date(now).getFullYear();

  const seeds: SeedSpec[] = [
    {
      ref: `LA-${year}-0001`,
      applicantId: 'APL-1001',
      fullName: 'Sarah Mitchell',
      idCardNumber: '109876543210987651',
      age: 34,
      job: 'Senior product designer',
      hasCDI: true,
      isMarried: true,
      numberOfChildren: 1,
      monthlyIncome: 5200,
      totalDebt: 480,
      savings: 18_000,
      incomeVerified: true,
      loanAmount: 24_000,
      loanDuration: 48,
      loanPurpose: 'Home renovation',
      missedPayments: 0,
      createdAgo: 2 * DAY + 3 * HOUR,
      status: 'pending',
      document: { name: 'payslips-aug-oct-2026.pdf', size: 482_301 },
    },
    {
      ref: `LA-${year}-0002`,
      applicantId: 'APL-1002',
      fullName: 'Yassine Ben Ali',
      idCardNumber: '110234567890123452',
      age: 41,
      job: 'Logistics manager',
      hasCDI: true,
      isMarried: true,
      numberOfChildren: 2,
      monthlyIncome: 3900,
      totalDebt: 620,
      savings: 7000,
      incomeVerified: true,
      loanAmount: 18_000,
      loanDuration: 36,
      loanPurpose: 'Vehicle',
      missedPayments: 0,
      createdAgo: 5 * HOUR,
      status: 'pending',
      document: { name: 'attestation-salaire-cnas.pdf', size: 318_744 },
    },
    {
      ref: `LA-${year}-0003`,
      applicantId: 'APL-1003',
      fullName: 'Elena Rossi',
      idCardNumber: '111345678901234563',
      age: 29,
      job: 'Freelance photographer',
      hasCDI: false,
      isMarried: false,
      numberOfChildren: 0,
      monthlyIncome: 2600,
      totalDebt: 300,
      savings: 4500,
      incomeVerified: false,
      loanAmount: 15_000,
      loanDuration: 60,
      loanPurpose: 'Business',
      missedPayments: 1,
      createdAgo: DAY + 6 * HOUR,
      status: 'pending',
    },
    {
      ref: `LA-${year}-0004`,
      applicantId: 'APL-1004',
      fullName: 'David Okafor',
      idCardNumber: '112456789012345674',
      age: 38,
      job: 'Software engineer',
      hasCDI: true,
      isMarried: true,
      numberOfChildren: 2,
      monthlyIncome: 6100,
      totalDebt: 900,
      savings: 32_000,
      incomeVerified: true,
      loanAmount: 120_000,
      loanDuration: 120,
      loanPurpose: 'Home purchase',
      missedPayments: 0,
      createdAgo: 4 * DAY,
      status: 'approved',
      document: { name: 'payslips-jul-sep-2026.pdf', size: 640_512 },
      decision: {
        decisionId: 'DEC-5004',
        reason:
          'Strong and verified income, low debt ratio, and a healthy savings buffer. Approved at the requested terms.',
        managerName: 'M. Laurent',
        decidedAgo: 3 * DAY,
      },
    },
    {
      ref: `LA-${year}-0005`,
      applicantId: 'APL-1005',
      fullName: 'Amira Haddad',
      idCardNumber: '113567890123456785',
      age: 45,
      job: 'Retail supervisor',
      hasCDI: false,
      isMarried: true,
      numberOfChildren: 1,
      monthlyIncome: 2100,
      totalDebt: 780,
      savings: 1200,
      incomeVerified: true,
      loanAmount: 20_000,
      loanDuration: 48,
      loanPurpose: 'Debt consolidation',
      missedPayments: 4,
      createdAgo: 6 * DAY,
      status: 'denied',
      document: { name: 'attestation-salaire-2026.pdf', size: 291_008 },
      decision: {
        decisionId: 'DEC-5005',
        reason:
          'The estimated debt-to-income ratio exceeds the 40% policy limit and the file shows 4 missed payments in the last 12 months.',
        managerName: 'M. Laurent',
        decidedAgo: 4 * DAY,
      },
    },
    {
      ref: `LA-${year}-0006`,
      applicantId: 'APL-1006',
      fullName: 'Lucas Meyer',
      idCardNumber: '114678901234567896',
      age: 52,
      job: 'Secondary school teacher',
      hasCDI: true,
      isMarried: true,
      numberOfChildren: 0,
      monthlyIncome: 3400,
      totalDebt: 210,
      savings: 9500,
      incomeVerified: true,
      loanAmount: 9000,
      loanDuration: 24,
      loanPurpose: 'Education',
      missedPayments: 0,
      createdAgo: 3 * HOUR,
      status: 'pending',
      document: { name: 'attestation-salaire-education.pdf', size: 356_290 },
    },
  ];

  return seeds.map((spec) => makeSeedApplication(spec, now));
}

function nextReference(applications: LoanApplication[]): string {
  const year = new Date().getFullYear();
  const prefix = `LA-${year}-`;
  const highest = applications.reduce((max, application) => {
    if (!application.applicationId.startsWith(prefix)) return max;
    const value = Number(application.applicationId.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}

export const demoApi = {
  async listApplications(): Promise<LoanApplication[]> {
    await simulateLatency();
    return sortNewestFirst(readStore());
  },

  async getApplication(applicationId: string): Promise<LoanApplication> {
    await simulateLatency();
    const application = readStore().find((item) => item.applicationId === applicationId);
    if (!application) throw new Error('Application not found.');
    return application;
  },

  async createApplication(input: LoanApplicationInput): Promise<LoanApplication> {
    await simulateLatency();
    const applications = readStore();
    const application: LoanApplication = {
      ...input,
      applicant: { ...input.applicant, applicantId: uid('APL') },
      applicationId: nextReference(applications),
      status: 'pending',
      createdAt: new Date().toISOString(),
      decision: null,
    };
    writeStore([application, ...applications]);
    return application;
  },

  async decideApplication(
    applicationId: string,
    input: DecisionInput,
  ): Promise<LoanApplication> {
    await simulateLatency();
    const applications = readStore();
    const index = applications.findIndex((item) => item.applicationId === applicationId);
    if (index === -1) throw new Error('Application not found.');

    const current = applications[index];
    if (current.status !== 'pending') throw new Error('This application has already been decided.');

    const updated: LoanApplication = {
      ...current,
      status: input.status,
      decision: {
        decisionId: uid('DEC'),
        status: input.status,
        reason: input.reason,
        decisionDate: new Date().toISOString(),
        managerName: input.managerName,
      },
    };

    applications[index] = updated;
    writeStore(applications);
    return updated;
  },

  async resetDemoData(): Promise<LoanApplication[]> {
    await simulateLatency();
    const seed = buildSeed();
    writeStore(seed);
    return sortNewestFirst(seed);
  },
};

export type DemoApi = typeof demoApi;

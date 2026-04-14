import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from './mysql';

export interface SubmissionResult {
  inputSummary: string;
  expected: string;
  actual: string;
  passed: boolean;
  timeMs?: number;
  error?: string;
  statusId?: number;
  statusText?: string;
}

export interface SubmissionRecord {
  _id: string;
  userId: string;
  slug: string;
  language: 'python' | 'java';
  code: string;
  status: string;
  results: SubmissionResult[];
  stdout?: string;
  stderr?: string;
  createdAt: Date;
  updatedAt: Date;
}

type SubmissionRow = RowDataPacket & {
  id: number;
  user_id: number;
  slug: string;
  language: 'python' | 'java';
  code: string;
  status: string;
  results: string;
  stdout: string;
  stderr: string;
  created_at: Date;
  updated_at: Date;
};

const parseResults = (raw: unknown): SubmissionResult[] => {
  if (Array.isArray(raw)) return raw as SubmissionResult[];
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toRecord = (row: SubmissionRow): SubmissionRecord => ({
  _id: String(row.id),
  userId: String(row.user_id),
  slug: row.slug,
  language: row.language,
  code: row.code,
  status: row.status,
  results: parseResults(row.results),
  stdout: row.stdout,
  stderr: row.stderr,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export const createSubmissionRecord = async (input: {
  userId: string;
  slug: string;
  language: 'python' | 'java';
  code: string;
  status: string;
  results: SubmissionResult[];
  stdout?: string;
  stderr?: string;
}): Promise<SubmissionRecord> => {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO submissions (user_id, slug, language, code, status, results, stdout, stderr)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      Number(input.userId),
      input.slug,
      input.language,
      input.code,
      input.status,
      JSON.stringify(input.results || []),
      input.stdout || '',
      input.stderr || '',
    ],
  );

  const [rows] = await pool.query<SubmissionRow[]>(
    `SELECT * FROM submissions WHERE id = ? LIMIT 1`,
    [result.insertId],
  );
  if (!rows.length) throw new Error('Failed to create submission');
  return toRecord(rows[0]);
};

export const listSubmissionsByUserAndSlug = async (userId: string, slug: string): Promise<SubmissionRecord[]> => {
  const [rows] = await pool.query<SubmissionRow[]>(
    `SELECT * FROM submissions WHERE user_id = ? AND slug = ? ORDER BY created_at DESC LIMIT 50`,
    [Number(userId), slug],
  );
  return rows.map(toRecord);
};

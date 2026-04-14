import { Request, Response } from 'express';
import { getProblemBySlug } from '../utils/fsProblems';
import { addSolvedProblem } from '../data/users';
import { createSubmissionRecord, listSubmissionsByUserAndSlug } from '../data/submissions';

// Ensure fetch exists (Node 18+), otherwise use undici
// @ts-ignore
if (typeof fetch === 'undefined') {
  // dynamic import to avoid dependency if not needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fetch: undiciFetch } = require('undici');
  // @ts-ignore
  global.fetch = undiciFetch;
}

const JUDGE0_BASE = process.env.JUDGE0_BASE || 'https://ce.judge0.com';
const JUDGE0_KEY = process.env.JUDGE0_KEY || process.env.RAPIDAPI_KEY || '';

const LANGUAGE_MAP: Record<'python' | 'java', number> = {
  // Allow override via env; fallback to common Judge0 IDs
  python: Number(process.env.JUDGE0_PY || 71),
  java: Number(process.env.JUDGE0_JAVA || 62),
};

// Normalize outputs to compare ignoring whitespace differences
function normalizeOutput(s: string): string {
  return String(s || '')
    .replace(/\r/g, '')
    .trim()
    .split(/\s+/)
    .join(' ');
}

function outputsMatch(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);
  if (a === e) return true;
  if (a.toLowerCase() === e.toLowerCase()) return true;
  const an = Number(a), en = Number(e);
  if (!Number.isNaN(an) && !Number.isNaN(en)) {
    return Math.abs(an - en) <= 1e-9;
  }
  return false;
}

async function judge0Submit(code: string, language: 'python' | 'java', stdin: string = ''): Promise<any> {
  const langId = LANGUAGE_MAP[language];
  const payload = { source_code: code, language_id: langId, stdin };
  const tryBases: string[] = [];
  // If user provided explicit base
  if (process.env.JUDGE0_BASE) tryBases.push(process.env.JUDGE0_BASE);
  // Prefer RapidAPI if key present
  if (JUDGE0_KEY) tryBases.push('https://judge0-ce.p.rapidapi.com');
  // Public CE
  tryBases.push('https://ce.judge0.com');
  // Remove dupes preserving order
  const bases = Array.from(new Set(tryBases));

  let lastData: any = {};
  for (const base of bases) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (base.includes('rapidapi') && JUDGE0_KEY) {
      headers['X-RapidAPI-Key'] = JUDGE0_KEY;
      headers['X-RapidAPI-Host'] = new URL(base).host;
    }
    try {
      const createRes = await fetch(`${base}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      } as any);
      const text = await createRes.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      console.log('[Judge0] base', base, 'status', createRes.status, 'keys:', Object.keys(data));
      if (data && (data.stdout || data.stderr || data.compile_output || (data.status && data.status.id))) {
        return data;
      }
      lastData = data;
    } catch (e) {
      console.error('[Judge0] request failed for base', base, e);
      lastData = { error: String(e) };
    }
  }
  return lastData; // might be empty; caller will handle
}

export const runCode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { language = 'python', code = '', input = '' } = req.body || {};
    if (!code || typeof code !== 'string') return res.status(400).json({ message: 'Code is required' });
    if (language !== 'python' && language !== 'java') return res.status(400).json({ message: 'Only Python and Java are supported' });

    const out: any = await judge0Submit(code, language, input);
    const empty = !out || (!out.stdout && !out.stderr && !out.compile_output && !(out.status && out.status.id));
    if (empty) {
      return res.status(502).json({ message: 'Judge0 did not return output', debug: out });
    }
    return res.status(200).json({
      stdout: out.stdout ? String(out.stdout) : '',
      stderr: out.stderr ? String(out.stderr) : '',
      compileOutput: out.compile_output ? String(out.compile_output) : '',
      exitCode: out.status && out.status.id ? out.status.id : 0,
      statusId: out.status && out.status.id ? out.status.id : 0,
      status: out.status && out.status.description ? out.status.description : 'Unknown',
      time: out.time ? out.time : undefined,
      raw: out.raw ? out.raw : undefined,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a judged submission for a problem slug using examples as cases via Judge0.
export const createSubmission = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    const { slug } = req.params;
    const { code = '', language = 'python' } = req.body || {};

    if (!code) return res.status(400).json({ message: 'Code is required' });
    if (language !== 'python' && language !== 'java') return res.status(400).json({ message: 'Only Python and Java are supported' });

    const prob = getProblemBySlug(slug);
    if (!prob) return res.status(404).json({ message: 'Problem not found' });

    const cases = prob.examples || [];

    const results: any[] = [];
    let overall: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Failed' = 'Accepted';

    for (const ex of cases) {
      const input = (ex.input || '').trim();
      const out: any = await judge0Submit(code, language, input);
      const actualRaw = String(out && (out.stdout || out.stderr || out.compile_output) || '');
      const expectedRaw = String(ex.output || '');
      const actual = actualRaw.trim();
      const expected = expectedRaw.trim();

      const passed = outputsMatch(actual, expected);

      // Map Judge0 status to our overall
      const statusId = out && out.status ? out.status.id : undefined;
      const statusText = out && out.status ? out.status.description : undefined;
      if (statusId === 6) {
        if (overall === 'Accepted') overall = 'Time Limit Exceeded';
      } else if (statusId === 5 || statusId === 11) {
        if (overall === 'Accepted') overall = 'Runtime Error';
      } else if (!passed && overall === 'Accepted') {
        overall = 'Wrong Answer';
      }

      results.push({
        inputSummary: input,
        expected,
        actual,
        passed,
        timeMs: out && out.time ? Math.round(parseFloat(out.time) * 1000) : 0,
        error: (out && (out.stderr || out.compile_output)) || '',
        statusId: typeof statusId === 'number' ? statusId : undefined,
        statusText: statusText || '',
      });
    }

    const submission = await createSubmissionRecord({
      userId: req.user._id,
      slug,
      language,
      code,
      status: overall,
      results,
      stdout: results.map(r => r.actual).join('\n'),
      stderr: results.find(r => r.error)?.error || '',
    });

    if (overall === 'Accepted') {
      try { await addSolvedProblem(req.user._id, slug); } catch {}
    }

    return res.status(201).json({ submission });
  } catch (err) {
    console.error('Create submission error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const runExamples = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { slug } = req.params;
    const { code = '', language = 'python' } = req.body || {};
    if (!code) return res.status(400).json({ message: 'Code is required' });
    if (language !== 'python' && language !== 'java') return res.status(400).json({ message: 'Only Python and Java are supported' });
    const prob = getProblemBySlug(slug);
    if (!prob) return res.status(404).json({ message: 'Problem not found' });

    const cases = prob.examples || [];
    const results: any[] = [];
    let overall: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Failed' = 'Accepted';

    for (const ex of cases) {
      const input = (ex.input || '').trim();
      const out: any = await judge0Submit(code, language, input);
      const empty = !out || (!out.stdout && !out.stderr && !out.compile_output && !(out.status && out.status.id));
      if (empty) {
        results.push({ index: results.length, inputSummary: input, expected: ex.output || '', actual: '', passed: false, error: 'No output from Judge0', statusText: 'No Output' });
        if (overall === 'Accepted') overall = 'Failed';
        continue;
      }
      const actualRaw = String(out && (out.stdout || out.stderr || out.compile_output) || '');
      const expectedRaw = String(ex.output || '');
      const actual = actualRaw.trim();
      const expected = expectedRaw.trim();
      const passed = outputsMatch(actual, expected);
      const statusId = out && out.status ? out.status.id : undefined;
      const statusText = out && out.status ? out.status.description : undefined;
      if (statusId === 6) { if (overall === 'Accepted') overall = 'Time Limit Exceeded'; }
      else if (statusId === 5 || statusId === 11) { if (overall === 'Accepted') overall = 'Runtime Error'; }
      else if (!passed && overall === 'Accepted') { overall = 'Wrong Answer'; }
      results.push({ index: results.length, inputSummary: input, expected, actual, passed, timeMs: out.time ? Math.round(parseFloat(out.time) * 1000) : 0, error: (out.stderr || out.compile_output) || '', statusId, statusText: statusText || '' });
    }

    return res.status(200).json({ results, overallStatus: overall, total: results.length, passed: results.filter(r => r.passed).length });
  } catch (err) {
    console.error('Run examples error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const listSubmissions = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    const { slug } = req.params;
    const list = await listSubmissionsByUserAndSlug(req.user._id, slug);
    return res.status(200).json({ submissions: list });
  } catch (err) {
    console.error('List submissions error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

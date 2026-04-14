import fs from 'fs';
import path from 'path';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface FSProblem {
  _id: string; // use slug for convenience
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: string; // canonical category id, e.g., 'arrays-hashing'
  order: number;
  leetcodeUrl?: string;
  videoUrl?: string;
  hints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  tags: string[];
  sourcePath: string;
}

const resolveProblemsRoot = (): string => {
  const candidates = [
    process.env.PROBLEMS_ROOT,
    path.resolve(process.cwd(), 'problems'),
    path.resolve(process.cwd(), 'backend/problems'),
    path.resolve(__dirname, '../../problems'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  return path.resolve(process.cwd(), 'problems');
};

export const PROBLEMS_ROOT = resolveProblemsRoot();

// Map from folder name to canonical category id
const CATEGORY_MAP: Record<string, string> = {
  arrays: 'arrays-hashing',
  'two-pointers': 'two-pointers',
  '2-pointers': 'two-pointers',
  'sliding-window': 'sliding-window',
  stack: 'stack',
  'binary-search': 'binary-search',
  'linked-list': 'linked-list',
  trees: 'trees',
  tries: 'tries',
  heap: 'heap',
  backtracking: 'backtracking',
  graphs: 'graphs',
  'advanced-graphs': 'advanced-graphs',
  '1d-dp': '1d-dp',
  '2d-dp': '2d-dp',
  greedy: 'greedy',
  intervals: 'intervals',
  'math-geometry': 'math-geometry',
  'bit-manipulation': 'bit-manipulation',
};

// Reverse map from canonical category id to preferred folder name
const FOLDER_MAP: Record<string, string> = Object.entries(CATEGORY_MAP)
  .reduce((acc, [folder, id]) => { if (!(id in acc)) acc[id] = folder; return acc; }, {} as Record<string, string>);

// Helper: compute available category ids from actual folders present
export function getAvailableCategoryIds(): string[] {
  try {
    if (!fs.existsSync(PROBLEMS_ROOT) || !fs.statSync(PROBLEMS_ROOT).isDirectory()) return [];
    const dirs = fs.readdirSync(PROBLEMS_ROOT, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(d => d.name);
    const set = new Set<string>();
    for (const folder of dirs) {
      const id = CATEGORY_MAP[folder] || folder;
      set.add(id);
    }
    return Array.from(set);
  } catch {
    return [];
  }
}

// Removed FREE_CATEGORIES; all categories are now free

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function parseFrontMatter(content: string): { meta: any; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (match) {
    try {
      const meta = JSON.parse(match[1]);
      const body = content.slice(match[0].length);
      return { meta, body };
    } catch {
      // ignore malformed meta
    }
  }
  return { meta: {}, body: content };
}

function readProblemFile(filePath: string, categoryId: string, fallbackOrder: number): FSProblem | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { meta, body } = parseFrontMatter(raw);
    const fileName = path.basename(filePath, path.extname(filePath));
    const slug = meta.slug || slugify(fileName);
    const title = meta.title || fileName.replace(/[-_]/g, ' ');
    const difficulty: Difficulty = (meta.difficulty || 'Easy');
    const order = Number(meta.order) || fallbackOrder;

    return {
      _id: slug,
      slug,
      title,
      description: String(body || '').trim(),
      difficulty,
      category: categoryId,
      order,
      leetcodeUrl: meta.leetcodeUrl || '',
      videoUrl: meta.videoUrl || '',
      hints: Array.isArray(meta.hints) ? meta.hints : [],
      examples: Array.isArray(meta.examples) ? meta.examples : [],
      constraints: Array.isArray(meta.constraints) ? meta.constraints : [],
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      sourcePath: filePath,
    };
  } catch (e) {
    return null;
  }
}

export function listProblemsByCategory(categoryId: string): FSProblem[] {
  try {
    const folder = FOLDER_MAP[categoryId] || categoryId; // accept direct folder id too
    const catDir = path.join(PROBLEMS_ROOT, folder);
    if (!fs.existsSync(catDir) || !fs.statSync(catDir).isDirectory()) return [];
    const entries = fs.readdirSync(catDir, { withFileTypes: true })
      .filter(e => e.isFile() && ['.md', '.json', '.txt'].includes(path.extname(e.name).toLowerCase()));
    const problems: FSProblem[] = [];
    let order = 1;
    for (const e of entries) {
      const p = readProblemFile(path.join(catDir, e.name), categoryId, order);
      if (p) {
        problems.push(p);
        order++;
      }
    }
    // sort by order asc, then title
    problems.sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
    return problems;
  } catch {
    return [];
  }
}

export function listAllProblems(): FSProblem[] {
  const result: FSProblem[] = [];
  const visited = new Set<string>();
  for (const categoryId of getAvailableCategoryIds()) {
    const list = listProblemsByCategory(categoryId);
    for (const p of list) {
      const key = `${p.category}:${p.slug}`;
      if (!visited.has(key)) {
        visited.add(key);
        result.push(p);
      }
    }
  }
  return result;
}

export function getProblemBySlug(slug: string): FSProblem | null {
  for (const categoryId of getAvailableCategoryIds()) {
    const list = listProblemsByCategory(categoryId);
    const found = list.find(p => p.slug === slug);
    if (found) return found;
  }
  return null;
}

export function buildCategoryStats(solvedSet?: Set<string>) {
  return getAvailableCategoryIds().map((id) => {
    const name = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const list = listProblemsByCategory(id);
    const total = list.length;
    const solved = solvedSet ? list.filter(p => solvedSet.has(p.slug)).length : 0;
    return {
      id,
      name,
      total,
      solved,
      isLocked: false,
    };
  });
}

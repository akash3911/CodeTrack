import { Request, Response } from 'express';
import { listProblemsByCategory, getProblemBySlug, buildCategoryStats, getAvailableCategoryIds, FSProblem, PROBLEMS_ROOT } from '../utils/fsProblems';

// Get all problems for a category
export const getProblemsByCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { category } = req.params as { category: string };
    const { page = 1, limit = 20 } = req.query as { page?: number | string; limit?: number | string };

    const available = getAvailableCategoryIds();
    if (!available.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const all: FSProblem[] = listProblemsByCategory(category);
    const totalProblems = all.length;

    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit);
    const paged = all.slice(start, end);

    return res.status(200).json({
      problems: paged,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalProblems / Number(limit)),
        totalProblems,
        hasMore: end < totalProblems,
      },
      category,
      isLocked: false,
    });
  } catch (error) {
    console.error('Get problems error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get single problem
export const getProblem = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params; // slug
    const prob = getProblemBySlug(id);

    if (!prob) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    return res.status(200).json({ problem: prob });
  } catch (error) {
    console.error('Get problem error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all categories with stats
export const getCategories = async (req: Request, res: Response): Promise<Response> => {
  try {
    const solvedSet = req.user ? new Set<string>(req.user.solvedProblems || []) : undefined;
    const categories = buildCategoryStats(solvedSet);
    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(200).json({
      categories: [],
      message: 'Problems are temporarily unavailable',
      debug: process.env.NODE_ENV === 'development' ? { problemsRoot: PROBLEMS_ROOT } : undefined,
    });
  }
};

// Search problems
export const searchProblems = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { q = '' } = req.query as { q?: string };
    const query = String(q).toLowerCase();
    const categories = getAvailableCategoryIds();
    const all: FSProblem[] = categories.flatMap((c: string) => listProblemsByCategory(c));
    const results: FSProblem[] = all
      .filter((p: FSProblem) => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
      .sort((a: FSProblem, b: FSProblem) => a.order - b.order)
      .slice(0, 20);
    return res.status(200).json({ problems: results });
  } catch (error) {
    console.error('Search problems error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

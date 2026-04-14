import { Request, Response } from 'express';
import { getProblemBySlug } from '../utils/fsProblems';
import {
  addSolvedProblem,
  removeSolvedProblem,
  toggleStarredProblem,
} from '../data/users';

// Get user profile
export const getUserProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = req.user;
    const solvedCount = user.solvedProblems.length;
    const starredCount = user.starredProblems.length;

    // Difficulty breakdown is not available without scanning filesystem; keep zeros for MVP
    const difficultyStats = {
      easy: 0,
      medium: 0,
      hard: 0
    };

    const userProfile = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      stats: {
        totalSolved: solvedCount,
        totalStarred: starredCount,
        difficulty: difficultyStats
      },
      createdAt: user.createdAt
    };

    return res.status(200).json({ user: userProfile });

  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark problem as solved using slug
export const markProblemSolved = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { problemId } = req.params; // slug

    const prob = getProblemBySlug(problemId);
    if (!prob) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    await addSolvedProblem(req.user._id, prob.slug);

    return res.status(200).json({ message: 'Problem marked as solved' });

  } catch (error) {
    console.error('Mark problem solved error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Unmark problem as solved using slug
export const unmarkProblemSolved = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { problemId } = req.params; // slug

    await removeSolvedProblem(req.user._id, problemId);

    return res.status(200).json({ message: 'Problem unmarked as solved' });

  } catch (error) {
    console.error('Unmark problem solved error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Star/Unstar problem using slug
export const toggleProblemStar = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { problemId } = req.params; // slug

    const prob = getProblemBySlug(problemId);
    if (!prob) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const slug = prob.slug;
    const isStarred = await toggleStarredProblem(req.user._id, slug);
    return res.status(200).json({
      message: isStarred ? 'Problem starred' : 'Problem unstarred',
      isStarred,
    });

  } catch (error) {
    console.error('Toggle problem star error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user's solved problems (return slugs for MVP)
export const getSolvedProblems = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Optionally map to titles by reading filesystem; keep lightweight for now
    const problems = (req.user.solvedProblems || []).map(slug => ({ slug }));
    return res.status(200).json({ problems });

  } catch (error) {
    console.error('Get solved problems error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user's starred problems (return slugs for MVP)
export const getStarredProblems = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const problems = (req.user.starredProblems || []).map(slug => ({ slug }));
    return res.status(200).json({ problems });

  } catch (error) {
    console.error('Get starred problems error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

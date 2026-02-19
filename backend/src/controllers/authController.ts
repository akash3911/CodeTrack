import { Request, Response } from 'express';

// Get current user (Firebase auth)
export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userResponse = {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
      solvedProblems: req.user.solvedProblems,
      starredProblems: req.user.starredProblems,
      createdAt: req.user.createdAt
    };

    return res.status(200).json({
      user: userResponse
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

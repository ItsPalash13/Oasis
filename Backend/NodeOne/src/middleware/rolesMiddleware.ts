import { Request, Response, NextFunction } from 'express';
import { UserProfile } from '../models/UserProfile';

interface AuthRequest extends Request {
  user: {
    id: string;
  };
  userProfile?: any;
}

// Middleware to check if user has admin role
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Find user profile by userId
    const userProfile = await UserProfile.findOne({ userId });
    
    if (!userProfile) {
      res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
      return;
    }

    // Check if user has admin role
    if (userProfile.role !== 'admin' && userProfile.role !== 'adminQuestions') {
        console.log(userProfile.role);
      res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
      return;
    }

    // Add user profile to request for use in route handlers
    authReq.userProfile = userProfile;
    
    next();
  } catch (error) {
    console.error('Error in requireAdmin middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Middleware to check if user has specific role
export const requireRole = (requiredRole: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Find user profile by userId
      const userProfile = await UserProfile.findOne({ userId });
      
      if (!userProfile) {
        res.status(404).json({
          success: false,
          error: 'User profile not found'
        });
        return;
      }

      // Check if user has the required role
      if (userProfile.role !== requiredRole) {
        res.status(403).json({
          success: false,
          error: `Access denied. ${requiredRole} role required.`
        });
        return;
      }

      // Add user profile to request for use in route handlers
      req.userProfile = userProfile;
      
      next();
    } catch (error) {
      console.error(`Error in requireRole middleware for ${requiredRole}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Middleware to check if user has any of the specified roles
export const requireAnyRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Find user profile by userId
      const userProfile = await UserProfile.findOne({ userId });
      
      if (!userProfile) {
        res.status(404).json({
          success: false,
          error: 'User profile not found'
        });
        return;
      }

      // Check if user has any of the allowed roles
      if (!allowedRoles.includes(userProfile.role)) {
        res.status(403).json({
          success: false,
          error: `Access denied. One of the following roles required: ${allowedRoles.join(', ')}`
        });
        return;
      }

      // Add user profile to request for use in route handlers
      req.userProfile = userProfile;
      
      next();
    } catch (error) {
      console.error(`Error in requireAnyRole middleware for ${allowedRoles.join(', ')}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

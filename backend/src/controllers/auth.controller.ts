import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {
  public async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await authService.handleGoogleAuth(req.body);

      res.cookie('jwt_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        data: { user, token },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await authService.getOrCreateDefaultUser();
      res.status(200).json({
        success: true,
        data: { user: req.user || user, token },
      });
    } catch (err) {
      next(err);
    }
  }

  public async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('jwt_token');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }
}

export const authController = new AuthController();

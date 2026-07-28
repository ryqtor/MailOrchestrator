import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { env } from '../config/env';
import { User } from '@prisma/client';

export class AuthService {
  private userRepo = new UserRepository();

  public generateToken(user: { id: string; email: string; name: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  public async handleGoogleAuth(googleData: {
    googleId?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    idToken?: string;
  }): Promise<{ user: User; token: string }> {
    let email = googleData.email;
    let name = googleData.name;
    let avatarUrl = googleData.avatarUrl;
    let googleId = googleData.googleId;

    if (googleData.idToken && !email) {
      try {
        const decoded: any = jwt.decode(googleData.idToken);
        if (decoded && decoded.email) {
          email = decoded.email;
          name = name || decoded.name || email?.split('@')[0];
          avatarUrl = avatarUrl || decoded.picture;
          googleId = googleId || decoded.sub;
        }
      } catch (e) {
        // Continue with provided fields
      }
    }

    const finalEmail = email || `google_user_${Date.now()}@reachinbox.ai`;
    const finalName = name || 'Google User';
    const finalGoogleId = googleId || `gid_${Date.now()}`;
    const finalAvatar = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(finalName)}`;

    let user = await this.userRepo.findByGoogleId(finalGoogleId);

    if (!user) {
      user = await this.userRepo.findByEmail(finalEmail);
      if (!user) {
        user = await this.userRepo.create({
          email: finalEmail,
          name: finalName,
          avatarUrl: finalAvatar,
          googleId: finalGoogleId,
        });
      }
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  public async getOrCreateDefaultUser(): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.ensureDefaultUser();
    const token = this.generateToken(user);
    return { user, token };
  }
}

export const authService = new AuthService();

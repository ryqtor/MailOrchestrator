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
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<{ user: User; token: string }> {
    let user = await this.userRepo.findByGoogleId(googleData.googleId);

    if (!user) {
      user = await this.userRepo.findByEmail(googleData.email);
      if (!user) {
        user = await this.userRepo.create({
          email: googleData.email,
          name: googleData.name,
          avatarUrl: googleData.avatarUrl,
          googleId: googleData.googleId,
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

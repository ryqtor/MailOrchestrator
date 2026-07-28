import { z } from 'zod';

export const googleAuthSchema = z.object({
  body: z.object({
    googleId: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    name: z.string().optional(),
    avatarUrl: z.string().optional(),
    idToken: z.string().optional(),
  }),
});


import { z } from 'zod';

export const googleAuthSchema = z.object({
  body: z.object({
    googleId: z.string().min(1, 'Google ID is required'),
    email: z.string().email('Invalid email address'),
    name: z.string().min(1, 'Name is required'),
    avatarUrl: z.string().url().optional(),
  }),
});

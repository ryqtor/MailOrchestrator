import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { googleAuthSchema } from '../validators/auth.validator';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.post('/google', validate(googleAuthSchema), (req, res, next) => authController.googleLogin(req, res, next));
router.get('/me', authenticateJwt, (req, res, next) => authController.getMe(req, res, next));
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;

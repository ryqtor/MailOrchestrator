import { Router } from 'express';
import { emailController } from '../controllers/email.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/scheduled', (req, res, next) => emailController.getScheduledEmails(req, res, next));
router.get('/sent', (req, res, next) => emailController.getSentEmails(req, res, next));

export default router;

import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/health', (req, res, next) => healthController.getHealth(req, res, next));
router.get('/metrics', (req, res, next) => healthController.getMetrics(req, res, next));

export default router;

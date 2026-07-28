import { Router } from 'express';
import { senderController } from '../controllers/sender.controller';

const router = Router();

router.get('/', (req, res, next) => senderController.getSenders(req, res, next));
router.get('/default', (req, res, next) => senderController.getDefaultSender(req, res, next));
router.post('/', (req, res, next) => senderController.createSender(req, res, next));
router.put('/:id', (req, res, next) => senderController.updateSender(req, res, next));
router.post('/test', (req, res, next) => senderController.testSenderConnection(req, res, next));

export default router;

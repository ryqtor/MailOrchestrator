import { Router } from 'express';
import multer from 'multer';
import { campaignController } from '../controllers/campaign.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCampaignSchema, getCampaignsQuerySchema } from '../validators/campaign.validator';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

router.use(authenticateJwt);

router.post('/', validate(createCampaignSchema), (req, res, next) => campaignController.createCampaign(req, res, next));
router.post('/upload', upload.single('file'), (req, res, next) => campaignController.uploadCSVAndCreateCampaign(req, res, next));
router.get('/', validate(getCampaignsQuerySchema), (req, res, next) => campaignController.getCampaigns(req, res, next));
router.get('/:id', (req, res, next) => campaignController.getCampaignById(req, res, next));

export default router;

import express from 'express';
import { 
    getUnverifiedNeeds,
    getAllNeeds,
    verifyNeed,
    syncVerifications,
    getNeedById
} from '../controllers/needControllers.js';

const router = express.Router();

// GET /api/needs/unverified - Get only unverified needs
router.get('/unverified', getUnverifiedNeeds);
// GET /api/needs/all - Get all needs with statistics
router.get('/all', getAllNeeds);
// PUT /api/needs/verify/:id - Verify a single need
router.put('/verify/:id', verifyNeed);
// POST /api/needs/sync-verifications - Sync multiple verifications
router.post('/sync-verifications', syncVerifications);
// GET /api/needs/:id - Get specific need
router.get('/:id', getNeedById);

export default router;

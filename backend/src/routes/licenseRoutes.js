import express from 'express';
import { 
  activateLicense, 
  renewLicense, 
  blockLicense, 
  listLicenses, 
  validateLicense, 
  checkLicenseStatuses,
  getLicenseHistory
} from '../controllers/licenseController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Super Admin routes - require superadmin role
router.post('/activate', authenticate, authorize(['superadmin']), activateLicense);
router.post('/renew/:userId', authenticate, authorize(['superadmin']), renewLicense);
// Duplicamos el endpoint para que funcione tanto con '/list' como sin sufijo
router.get('/', authenticate, authorize(['superadmin']), listLicenses);
router.get('/list', authenticate, authorize(['superadmin']), listLicenses);
router.put('/block/:userId', authenticate, authorize(['superadmin']), blockLicense);
router.get('/history/:licenseId', authenticate, authorize(['superadmin']), getLicenseHistory);

// Validation routes - any authenticated user can validate their own license
router.get('/validate/:userId', authenticate, validateLicense);

// Cron job route - protected but can be called by cron service
router.post('/check-status', authenticate, authorize(['superadmin']), checkLicenseStatuses);

export default router;

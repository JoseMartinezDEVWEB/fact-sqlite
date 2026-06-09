import express from 'express';
import { 
  getSalesReport, 
  getExpensesReport, 
  getDebtsReport, 
  getProductsReport, 
  getBalanceReport,
  clearReportCache 
} from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/authmiddleware.js';

const router = express.Router();

// Proteger todas las rutas con autenticación
router.use(authMiddleware);

// Rutas de reportes
router.get('/sales', getSalesReport);
router.get('/expenses', getExpensesReport);
router.get('/debts', getDebtsReport);
router.get('/products', getProductsReport);
router.get('/balance', getBalanceReport);
router.get('/clear-cache', clearReportCache);

export default router;

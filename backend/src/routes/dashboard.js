import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import {authMiddleware} from '../middleware/authmiddleware.js';

const router = express.Router();

// Protegemos las rutas con el middleware de autenticación
router.use(authMiddleware);

// Ruta para obtener datos del dashboard
router.get('/data', dashboardController.getDashboardData);

// Ruta para obtener estadísticas detalladas
router.get('/stats', dashboardController.getDetailedStats);

// NUEVA RUTA: Obtener productos más vendidos con paginación
router.get('/top-products', dashboardController.getTopProducts);

router.get('/daily-sales', dashboardController.getDailySales);

// Ruta para obtener ventas fiadas diarias
router.get('/daily-credit-sales', dashboardController.getDailyCreditSales);

// Facturas fiadas por cliente
router.get('/client-credit-invoices/:clientId', dashboardController.getClientCreditInvoices);

// Obtener facturas por fecha
router.get('/invoices-by-date', dashboardController.getInvoicesByDate);

export default router;
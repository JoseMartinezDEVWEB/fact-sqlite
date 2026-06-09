import express from 'express';
import {
    createQuote,
    getQuote,
    getQuotes,
    updateQuoteStatus,
    convertToInvoice
} from '../controllers/quoteController.js';
import { authMiddleware, checkRole } from '../middleware/authmiddleware.js';
import { 
    validateCreateQuote, 
    validateQuoteData, 
    validateQuoteStatusUpdate 
} from '../middleware/quoteValidation.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// Listar todas las cotizaciones con filtros
router.get('/',
    checkRole(['superadmin', 'admin', 'encargado', 'cajero']),
    getQuotes
);

// Obtener una cotización específica
router.get('/:id',
    checkRole(['superadmin', 'admin', 'encargado', 'cajero']),
    getQuote
);

// Crear una nueva cotización
router.post('/',
    checkRole(['superadmin', 'admin', 'encargado', 'cajero']),
    validateCreateQuote,
    validateQuoteData,
    createQuote
);

// Actualizar estado de una cotización
router.patch('/:id/status',
    checkRole(['superadmin', 'admin', 'encargado']),
    validateQuoteStatusUpdate,
    updateQuoteStatus
);

// Convertir cotización a factura
router.post('/:id/convert',
    checkRole(['superadmin', 'admin', 'encargado', 'cajero']),
    convertToInvoice
);

export default router;
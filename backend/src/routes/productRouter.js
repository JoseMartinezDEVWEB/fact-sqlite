import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { authMiddleware, checkRole } from '../middleware/authMiddleware.js';
import { createProduct, updateProduct, deleteProduct, getProducts, getProductById, getProductByBarcode } from '../controllers/productController.js';
import { importProductsFromExcelFile, deleteAllProducts } from '../controllers/importController.js';
import { uploadExcel } from '../config/multer.js';

const router = express.Router();

// Directorio temporal para imágenes antes de subir a Cloudinary
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'images');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de Multer para manejo de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

//const upload = multer({ storage: storage });

// Filtro de archivos
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no válido. Solo se permiten imágenes (jpeg, png, gif)'), false);
    }
  };
  
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB límite
    }
  });
  
  // Manejo de errores de multer
  const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        message: 'Error al subir el archivo',
        error: err.message
      });
    }
    next(err);
  };

// Ruta para verificar permisos antes de importar productos
router.get(
  '/check-permission',
  authMiddleware,
  checkRole(['admin', 'encargado', 'superadmin']),
  (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Tienes permisos para crear productos',
      user: {
        role: req.user.role,
        id: req.user._id
      }
    });
  }
);

// Rutas protegidas que requieren rol de admin o encargado
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'encargado', 'superadmin']),
  upload.single('image'),
  handleMulterError,
  createProduct
);

router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'encargado', 'superadmin']),
  upload.single('image'),
  updateProduct
);

// Eliminar TODOS los productos — debe ir ANTES de /:id
router.delete(
  '/delete-all',
  authMiddleware,
  checkRole(['superadmin']),
  deleteAllProducts
);

router.delete(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'encargado', 'superadmin']),
  deleteProduct
);

router.get('/products/barcode/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/barcode/:barcode',  getProductByBarcode);

// Importar productos en masa desde Excel (solo superadmin)
router.post(
  '/import/excel',
  authMiddleware,
  checkRole(['superadmin']),
  uploadExcel.single('excelFile'),
  importProductsFromExcelFile
);

// Rutas públicas (accesibles para todos los usuarios autenticados)
router.get('/', authMiddleware, getProducts);
router.get('/:id', authMiddleware, getProductById);

// Rutas para crear/actualizar producto con imagen
router.post(
  '/with-image',
  authMiddleware,
  checkRole(['admin', 'encargado', 'superadmin']),
  upload.single('image'),
  handleMulterError,
  createProduct
);

router.put(
  '/:id/with-image',
  authMiddleware,
  checkRole(['admin', 'encargado', 'superadmin']),
  upload.single('image'),
  updateProduct
);

export default router;
import { Product } from '../models/Product.js';
import Business from '../models/businessModel.js';

// Función auxiliar para validar ID (UUID o cualquier string no vacío)
const isValidObjectId = (id) => {
    return id && typeof id === 'string' && id.length > 0;
};

// Función auxiliar para validar email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Función auxiliar para validar fecha ISO
const isValidISODate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString === date.toISOString();
};

// Middleware de validación para crear cotizaciones
export const validateCreateQuote = (req, res, next) => {
    const errors = [];
    const { businessId, customer, items, purchaseType, validUntil, taxes } = req.body;

    // Validar businessId
    if (!businessId) {
        errors.push({
            field: 'businessId',
            message: 'El ID del negocio es requerido',
            value: businessId
        });
    } else if (!isValidObjectId(businessId)) {
        errors.push({
            field: 'businessId',
            message: 'El ID del negocio debe ser válido',
            value: businessId
        });
    }

    // Validar customer
    if (!customer || !customer.name) {
        errors.push({
            field: 'customer.name',
            message: 'El nombre del cliente es requerido',
            value: customer?.name
        });
    } else if (customer.name.length < 2 || customer.name.length > 100) {
        errors.push({
            field: 'customer.name',
            message: 'El nombre del cliente debe tener entre 2 y 100 caracteres',
            value: customer.name
        });
    }

    if (customer?.email && !isValidEmail(customer.email)) {
        errors.push({
            field: 'customer.email',
            message: 'El email del cliente debe ser válido',
            value: customer.email
        });
    }

    if (customer?.phone && (customer.phone.length < 7 || customer.phone.length > 20)) {
        errors.push({
            field: 'customer.phone',
            message: 'El teléfono debe tener entre 7 y 20 caracteres',
            value: customer.phone
        });
    }

    if (customer?.type && !['individual', 'business', 'anonymous'].includes(customer.type)) {
        errors.push({
            field: 'customer.type',
            message: 'El tipo de cliente debe ser individual, business o anonymous',
            value: customer.type
        });
    }

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push({
            field: 'items',
            message: 'Debe incluir al menos un producto',
            value: items
        });
    } else {
        items.forEach((item, index) => {
            if (!item.productId) {
                errors.push({
                    field: `items[${index}].productId`,
                    message: 'El ID del producto es requerido',
                    value: item.productId
                });
            } else if (!isValidObjectId(item.productId)) {
                errors.push({
                    field: `items[${index}].productId`,
                    message: 'El ID del producto debe ser válido',
                    value: item.productId
                });
            }

            if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1) {
                errors.push({
                    field: `items[${index}].quantity`,
                    message: 'La cantidad debe ser un número entero mayor a 0',
                    value: item.quantity
                });
            }

            if (item.discount !== undefined && (isNaN(item.discount) || item.discount < 0)) {
                errors.push({
                    field: `items[${index}].discount`,
                    message: 'El descuento debe ser un número mayor o igual a 0',
                    value: item.discount
                });
            }
        });
    }

    // Validar purchaseType
    if (!purchaseType) {
        errors.push({
            field: 'purchaseType',
            message: 'El tipo de compra es requerido',
            value: purchaseType
        });
    } else if (!['retail', 'wholesale'].includes(purchaseType)) {
        errors.push({
            field: 'purchaseType',
            message: 'El tipo de compra debe ser retail o wholesale',
            value: purchaseType
        });
    }

    // Validar validUntil (opcional)
    if (validUntil && !isValidISODate(validUntil)) {
        const testDate = new Date(validUntil);
        if (isNaN(testDate.getTime())) {
            errors.push({
                field: 'validUntil',
                message: 'La fecha de validez debe ser una fecha válida',
                value: validUntil
            });
        }
    }

    // Validar taxes (opcional)
    if (taxes !== undefined) {
        if (!Array.isArray(taxes)) {
            errors.push({
                field: 'taxes',
                message: 'Los impuestos deben ser un array',
                value: taxes
            });
        } else {
            taxes.forEach((tax, index) => {
                if (!tax.name) {
                    errors.push({
                        field: `taxes[${index}].name`,
                        message: 'El nombre del impuesto es requerido',
                        value: tax.name
                    });
                }

                if (tax.rate === undefined || isNaN(tax.rate) || tax.rate < 0 || tax.rate > 100) {
                    errors.push({
                        field: `taxes[${index}].rate`,
                        message: 'La tasa de impuesto debe estar entre 0 y 100',
                        value: tax.rate
                    });
                }
            });
        }
    }

    // Si hay errores, devolver respuesta de error
    if (errors.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Errores de validación',
            errors: errors
        });
    }

    next();
};

// Middleware para validar existencia de productos y negocio
export const validateQuoteData = async (req, res, next) => {
    try {
        const { businessId, items } = req.body;

        // Verificar que el negocio existe o crear uno por defecto si no existe
        let business;
        try {
            business = await Business.findById(businessId);
        } catch (error) {
            console.log('Error al buscar negocio por ID, probablemente ID inválido');
            business = null;
        }
        
        if (!business) {
            console.log('Negocio no encontrado, buscando o creando negocio por defecto');
            // Buscar si existe algún negocio en la base de datos
            business = await Business.findOne();
            
            if (!business) {
                // Crear un negocio por defecto si no existe ninguno
                business = await Business.create({
                    name: 'Mi Negocio',
                    taxId: '12345678901',
                    address: 'Dirección Principal',
                    phone: '000-000-0000',
                    email: 'contacto@minegocio.com',
                    website: '',
                    logo: null
                });
                console.log('Negocio por defecto creado:', business._id);
            } else {
                console.log('Usando negocio existente:', business._id);
            }
            
            // Actualizar el businessId en el request para usar el correcto
            req.body.businessId = business._id;
        }

        // Verificar que todos los productos existen
        const productIds = items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        if (products.length !== productIds.length) {
            const foundIds = products.map(p => p._id.toString());
            const missingIds = productIds.filter(id => !foundIds.includes(id));
            
            return res.status(404).json({
                status: 'error',
                message: 'Algunos productos no existen',
                missingProducts: missingIds
            });
        }

        // Agregar productos al request para uso posterior
        req.validatedProducts = products;
        req.validatedBusiness = business;

        next();
    } catch (error) {
        console.error('Error en validación de datos de cotización:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno al validar los datos de la cotización',
            error: error.message
        });
    }
};

// Middleware para validar actualización de estado
export const validateQuoteStatusUpdate = (req, res, next) => {
    const errors = [];
    const { status, reason } = req.body;

    // Validar status
    if (!status) {
        errors.push({
            field: 'status',
            message: 'El estado es requerido',
            value: status
        });
    } else if (!['pending', 'approved', 'rejected', 'expired', 'converted'].includes(status)) {
        errors.push({
            field: 'status',
            message: 'El estado debe ser: pending, approved, rejected, expired o converted',
            value: status
        });
    }

    // Validar reason (opcional)
    if (reason !== undefined && (reason.length < 5 || reason.length > 500)) {
        errors.push({
            field: 'reason',
            message: 'El motivo debe tener entre 5 y 500 caracteres',
            value: reason
        });
    }

    // Si hay errores, devolver respuesta de error
    if (errors.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Errores de validación',
            errors: errors
        });
    }

    next();
};

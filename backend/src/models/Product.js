import { BaseModel, getDb } from '../config/database.js';

export const UNIT_TYPES = { UNIT: 'unidad', WEIGHT: 'peso', PACKAGE: 'paquete' };
export const WEIGHT_UNITS = { KG: 'kg', G: 'g', LB: 'lb', OZ: 'oz' };

class ProductModel extends BaseModel {
  constructor() { super('products'); }

  _toDoc(row) {
    const doc = super._toDoc(row);
    if (!doc) return null;
    // Reconstruir objeto image
    doc.image = { url: doc.imageUrl || null, publicId: doc.imagePublicId || null };
    // Reconstruir objeto creditPurchase
    doc.creditPurchase = {
      isCredit: Boolean(doc.creditIsCredit),
      paymentTerm: doc.creditPaymentTerm || '30dias',
      dueDate: doc.creditDueDate || null,
      isPaid: Boolean(doc.creditIsPaid),
      paymentDate: doc.creditPaymentDate || null
    };
    // Calcular alertActive
    if (doc.quantity <= doc.minStock) doc.alertActive = true;
    return doc;
  }

  _toRow(data) {
    const row = super._toRow(data);

    // Aplanar image (objeto o null — BaseModel no serializa image a _json)
    if (data.image && typeof data.image === 'object') {
      row.image_url        = data.image.url       || null;
      row.image_public_id  = data.image.publicId  || null;
    }
    // Siempre eliminar la clave 'image' plana (no es columna válida)
    delete row.image;

    // Aplanar creditPurchase — puede llegar como objeto o como JSON string (FormData)
    {
      let cp = data.creditPurchase;
      if (typeof cp === 'string') {
        try { cp = JSON.parse(cp); } catch (_) { cp = null; }
      }
      if (cp && typeof cp === 'object') {
        row.credit_is_credit    = cp.isCredit  ? 1 : 0;
        row.credit_payment_term = cp.paymentTerm || '30dias';
        row.credit_due_date     = cp.dueDate    || null;
        row.credit_is_paid      = cp.isPaid     ? 1 : 0;
        row.credit_payment_date = cp.paymentDate || null;
      }
      // Eliminar ambas variantes que BaseModel puede generar
      delete row.credit_purchase;      // cuando llega como string
      delete row.credit_purchase_json; // cuando llega como objeto (BaseModel lo serializa a _json)
    }
    // Aplanar referencias — usar 'in' para detectar la clave aunque sea null
    if ('provider'     in row) { row.provider_id      = row.provider     || null; delete row.provider;      }
    if ('category'     in row) { row.category_id      = row.category     || null; delete row.category;      }
    if ('parent_package' in row) { row.parent_package_id = row.parent_package || null; delete row.parent_package; }
    if ('unit_product' in row) { row.unit_product_id  = row.unit_product || null; delete row.unit_product;  }
    // Versiones camelCase directas (usadas cuando el controller crea el producto unidad internamente)
    if ('parentPackageId' in data) { row.parent_package_id = data.parentPackageId || null; delete row.parent_package_id_camel; }
    if ('categoryId'      in data) { row.category_id       = data.categoryId      || null; }
    if ('providerId'      in data) { row.provider_id       = data.providerId      || null; }
    if ('isUnitOfPackage' in data) { row.is_unit_of_package = data.isUnitOfPackage ? 1 : 0; }
    if ('alertActive'     in data) { row.alert_active       = data.alertActive     ? 1 : 0; }
    if ('pricePerUnit'    in data) { row.price_per_unit     = parseFloat(data.pricePerUnit) || 0; }
    // También manejar versiones camelCase antiguas que lleguen sin convertir
    if ('parentPackage' in data && !('parent_package_id' in row)) {
      row.parent_package_id = data.parentPackage || null;
      delete row.parent_package;
    }
    if ('unitProduct' in data && !('unit_product_id' in row)) {
      row.unit_product_id = data.unitProduct || null;
      delete row.unit_product;
    }
    if (data.createdBy) { row.created_by = data.createdBy; }
    delete row.created_by_ref;
    if (data.updatedBy) { row.updated_by = data.updatedBy; }
    
    // Eliminar columnas transitorias del frontend no existentes en la base de datos
    delete row.profit_percentage;
    delete row.profit_percent;
    // Etiquetas de paquete/unidad derivada (solo usadas en frontend)
    delete row.derived_unit_label;
    delete row.derivedUnitLabel;
    delete row.package_unit_label;
    delete row.packageUnitLabel;
    // Eliminar creditPurchase en todas sus variantes restantes
    delete row.creditPurchase;
    // Eliminar campos camelCase que ya fueron mapeados a snake_case
    delete row.parentPackageId;
    delete row.categoryId;
    delete row.providerId;
    delete row.isUnitOfPackage;
    delete row.alertActive;
    delete row.pricePerUnit;

    return row;
  }

  async find(filter = {}, opts = {}) {
    // Manejar populate de category y provider en find
    const result = await super.find(filter, opts);
    return result;
  }

  async _insertOne(data) {
    const qty = parseFloat(data.quantity) || 0;
    const minStock = parseFloat(data.minStock) || 10;
    data.alertActive = qty <= minStock;

    // Calcular pricePerUnit
    if (data.unitType === UNIT_TYPES.WEIGHT && data.packageWeight > 0 && data.salePrice > 0) {
      data.pricePerUnit = parseFloat((data.salePrice / data.packageWeight).toFixed(2));
    }
    if (data.unitType === UNIT_TYPES.PACKAGE && data.unitsPerPackage > 0 && data.salePrice > 0) {
      data.pricePerUnit = parseFloat((data.salePrice / data.unitsPerPackage).toFixed(2));
    }

    return super._insertOne(data);
  }
}

export const Product = new ProductModel();

import { BaseModel, getDb } from '../config/database.js';

class ClienteModel extends BaseModel {
  constructor() { super('clientes'); }

  _toDoc(row) {
    const doc = super._toDoc(row);
    if (!doc) return null;
    // Reconstruir objeto address anidado
    doc.address = {
      street: doc.addressStreet || null,
      city: doc.addressCity || null,
      state: doc.addressState || null,
      zipCode: doc.addressZip || null,
      country: doc.addressCountry || null
    };
    doc.rncCedula = doc.rncCedula || null;
    doc.tipoNegocio = doc.tipoNegocio || null;
    return doc;
  }

  _toRow(data) {
    const row = super._toRow(data);
    // BaseModel convierte address-objeto a address_json (address está en jsonFields).
    // La tabla clientes no tiene esa columna — eliminamos ambas variantes.
    delete row.address;
    delete row.address_json;
    if (data.address !== undefined && data.address !== null) {
      if (typeof data.address === 'object') {
        // Objeto anidado { street, city, state, zipCode, country }
        row.address_street  = data.address.street   || null;
        row.address_city    = data.address.city     || null;
        row.address_state   = data.address.state    || null;
        row.address_zip     = data.address.zipCode  || null;
        row.address_country = data.address.country  || null;
      } else if (typeof data.address === 'string' && data.address.trim()) {
        // String simple → guardarlo en address_street
        row.address_street = data.address.trim();
      }
    }
    return row;
  }
}

const Cliente = new ClienteModel();
export default Cliente;

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, FileSpreadsheet, Check, AlertCircle, Download, AlertTriangle, Info } from 'lucide-react';
import PropTypes from 'prop-types';

let XLSX;
const loadXLSX = async () => {
  if (!XLSX) XLSX = await import('xlsx/dist/xlsx.full.min.js');
  return XLSX;
};

// ─── Misma lógica de detección inteligente que el backend ────────────
const HEADER_KEYWORDS = [
  'nombre', 'name', 'descripcion', 'description', 'producto',
  'sku', 'codigo', 'barcode', 'clave',
  'costo', 'cost', 'precio', 'price',
  'cantidad', 'quantity'
];

const COL_MAP = {
  name:          ['nombre', 'name', 'descripcion', 'description', 'producto', 'articulo', 'item', 'detalle', 'desc'],
  barcode:       ['sku', 'codigo', 'barcode', 'cod', 'codbar', 'ref', 'referencia', 'clave', 'ean', 'codigoproducto', 'codigodebarras', 'barras'],
  purchasePrice: ['costo', 'cost', 'precio_compra', 'preciocompra', 'costo_unitario', 'p.compra', 'pcompra', 'compra'],
  salePrice:     ['precio', 'price', 'precio_venta', 'precioventa', 'pvp', 'venta', 'p.venta', 'pventa'],
  quantity:      ['cantidad', 'quantity', 'qty', 'existencia', 'existencias', 'stock', 'inventario'],
  unitType:      ['tipo', 'type', 'unidad', 'unit', 'tipo_unidad'],
};

const norm = (s) =>
  String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_.]/g, '').trim();

const findHeaderRow = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const hits = row.map(norm).filter(v => HEADER_KEYWORDS.some(k => v.includes(k)));
    if (hits.length >= 2) return i;
  }
  return 0;
};

// Detectar si una columna tiene valores que parecen EAN (8+ dígitos numéricos)
const colLooksLikeBarcode = (rows, idx) => {
  const vals = rows.slice(0, 10).map(r => String(r[idx] ?? '').trim()).filter(v => v !== '');
  if (!vals.length) return false;
  return vals.filter(v => /^\d{7,}$/.test(v)).length / vals.length >= 0.6;
};

// Detectar si una columna tiene texto real (letras)
const colLooksLikeName = (rows, idx) => {
  const vals = rows.slice(0, 10).map(r => String(r[idx] ?? '').trim()).filter(v => v !== '');
  if (!vals.length) return false;
  return vals.filter(v => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(v)).length / vals.length >= 0.5;
};

// Construir mapa de columnas con detección inteligente por valores
const buildSmartColIdx = (headers, dataRows) => {
  const norms = headers.map(norm);
  const idx   = {};

  const findAll = (field) => {
    const candidates = [];
    for (let i = 0; i < norms.length; i++) {
      if (COL_MAP[field].some(v => norms[i] === norm(v) || norms[i].includes(norm(v)))) candidates.push(i);
    }
    return candidates;
  };

  const nameCands    = findAll('name');
  const barcodeCands = new Set(findAll('barcode'));
  let   nameIdx      = -1;

  for (const ci of nameCands) {
    if (colLooksLikeBarcode(dataRows, ci)) {
      barcodeCands.add(ci); // columna "Nombre" que tiene barcodes
    } else if (colLooksLikeName(dataRows, ci) && nameIdx === -1) {
      nameIdx = ci;
    }
  }
  // Fallback: buscar cualquier columna con texto
  if (nameIdx === -1) {
    for (let i = 0; i < headers.length; i++) {
      if (!barcodeCands.has(i) && colLooksLikeName(dataRows, i)) { nameIdx = i; break; }
    }
  }

  idx.name    = nameIdx;
  idx.barcode = barcodeCands.size > 0 ? Math.min(...barcodeCands) : -1;

  // Solo iterar sobre campos que existen en COL_MAP
  for (const f of ['purchasePrice', 'salePrice', 'quantity', 'unitType']) {
    idx[f] = findAll(f)[0] ?? -1;
  }
  return idx;
};

const downloadTemplate = () => {
  loadXLSX().then((xlsxModule) => {
    const headers = ['nombre', 'precioCompra', 'precioVenta', 'cantidad', 'codigo', 'tipo'];
    const example = ['Arroz Diana 5lb', '85.00', '100.00', '50', '7701001', 'unidad'];
    const ws = xlsxModule.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    const wb = xlsxModule.utils.book_new();
    xlsxModule.utils.book_append_sheet(wb, ws, 'Productos');
    xlsxModule.writeFile(wb, 'plantilla_productos.xlsx');
  });
};

const ExcelImportModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile]                   = useState(null);
  const [fileName, setFileName]           = useState('');
  const [preview, setPreview]             = useState([]);
  const [totalRows, setTotalRows]         = useState(0);
  const [detectedCols, setDetectedCols]   = useState({});
  const [headerRowNum, setHeaderRowNum]   = useState(0);
  const [loading, setLoading]             = useState(false);
  const [importing, setImporting]         = useState(false);
  const [error, setError]                 = useState('');
  const [result, setResult]               = useState(null);
  const [showPreview, setShowPreview]     = useState(false);
  const fileInputRef                      = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadXLSX();
      setFile(null); setFileName(''); setPreview([]); setTotalRows(0);
      setLoading(false); setImporting(false); setError(''); setResult(null);
      setShowPreview(false); setDetectedCols({}); setHeaderRowNum(0);
    }
  }, [isOpen]);

  const processFile = async (selectedFile) => {
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Selecciona un archivo Excel válido (.xlsx, .xls, .csv)');
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError('');
    setShowPreview(false);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const xlsxModule = await loadXLSX();
        const data = new Uint8Array(e.target.result);
        const workbook = xlsxModule.read(data, { type: 'array', raw: true });
        const ws = workbook.Sheets[workbook.SheetNames[0]];

        // Leer como arrays para detectar encabezados correctamente
        const allRows = xlsxModule.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

        const hIdx     = findHeaderRow(allRows);
        const hdrs     = allRows[hIdx];
        const dataRows = allRows.slice(hIdx + 1).filter(r => r.some(v => String(v).trim() !== ''));
        // Detección inteligente: analiza valores para resolver columnas duplicadas
        const cIdx     = buildSmartColIdx(hdrs, dataRows);

        setHeaderRowNum(hIdx + 1);
        setDetectedCols(cIdx);
        setTotalRows(dataRows.length);

        const getCellVal = (row, idx) =>
          idx !== undefined && idx >= 0 && idx < row.length ? row[idx] : '';

        // Vista previa primeras 8 filas
        const previewRows = dataRows.slice(0, 8).map((row, i) => {
          const name          = String(getCellVal(row, cIdx.name) || '').trim();
          const barcode       = String(getCellVal(row, cIdx.barcode) || '').trim();
          const purchasePrice = parseFloat(getCellVal(row, cIdx.purchasePrice)) || 0;
          const salePrice     = parseFloat(getCellVal(row, cIdx.salePrice)) || 0;
          const unitType      = String(getCellVal(row, cIdx.unitType) || 'unidad').toLowerCase().trim();
          const excelQty      = parseFloat(getCellVal(row, cIdx.quantity)) || 0;
          const errors = [];
          if (!name) errors.push('Nombre vacío');
          if (purchasePrice <= 0 && salePrice <= 0) errors.push('Sin precio');
          return { rowIndex: hIdx + 2 + i, name, barcode, purchasePrice, salePrice, unitType, excelQty, valid: errors.length === 0, errors };
        });

        setPreview(previewRows);
        setShowPreview(true);

        if (cIdx.name === -1) {
          setError(`No se detectó la columna "Nombre". Encabezados en fila ${hIdx + 1}: ${hdrs.filter(Boolean).join(', ')}`);
        }
      } catch (err) {
        setError('No se pudo leer el archivo: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => setError('Error al leer el archivo');
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };
  const handleDrop       = (e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); };

  const handleImport = async () => {
    if (!file) { setError('Selecciona un archivo primero'); return; }
    if (detectedCols.name === -1) { setError('No se detectó la columna "Nombre"'); return; }
    setImporting(true);
    setError('');
    try {
      const res = await onImport(file, { defaultUnitType: 'unidad' });
      // onImport (handleImportProducts) ya normaliza: retorna { imported, total, skipped, errors, ... }
      setResult(res || {});
    } catch (err) {
      setError(err.message || 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  const invalidCount = preview.filter(p => !p.valid).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-green-600" size={22} />
            <h2 className="text-lg font-bold text-gray-800">Importar Productos desde Excel</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Resultado final */}
          {result && (
            <div className={`rounded-lg p-4 ${result.imported > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.imported > 0
                  ? <Check className="text-green-600" size={20} />
                  : <AlertTriangle className="text-yellow-600" size={20} />}
                <p className="font-semibold">
                  {result.imported > 0
                    ? `✅ ${result.imported} de ${result.total} productos importados`
                    : `⚠️ No se importó ningún producto`}
                </p>
              </div>
              {result.skipped > 0 && (
                <p className="text-sm text-gray-600 mb-2">{result.skipped} productos omitidos</p>
              )}
              {result.errors?.length > 0 && (
                <div className="mt-2 max-h-28 overflow-y-auto bg-white rounded p-2 border border-red-100">
                  <p className="text-xs font-semibold text-red-700 mb-1">Errores ({result.errors.length}):</p>
                  {result.errors.slice(0, 20).map((e, i) => (
                    <p key={i} className="text-xs text-red-600">• <strong>{e.product}</strong>: {e.error}</p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-xs text-gray-500">... y {result.errors.length - 20} más</p>
                  )}
                </div>
              )}
              <p className="text-xs text-blue-700 mt-3 font-medium">
                📦 El stock de cada producto fue tomado de la columna "Cantidad" del archivo.
              </p>
              <button onClick={onClose} className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                Cerrar y ver productos
              </button>
            </div>
          )}

          {!result && (
            <>
              {/* Avisos */}
              <div className="bg-green-50 border border-green-300 rounded-lg p-3 flex gap-2">
                <Check className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-sm font-semibold text-green-800">El stock se importa automáticamente</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    La columna <strong>"Cantidad"</strong> del archivo se importa como el stock actual de cada producto.
                    Puedes editarlo después si necesitas ajustarlo.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-blue-700">
                  Categoría automática: <strong>"Productos Generales"</strong>. Puedes cambiarla editando cada producto.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex gap-2">
                <Info className="text-purple-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-purple-700">
                  <strong>Detección automática:</strong> Compatible con exportaciones de otros sistemas.
                  Detecta encabezados SKU, Nombre, Costo, Precio aunque el archivo tenga filas de título al inicio.
                </p>
              </div>

              {/* Plantilla */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
                <div>
                  <p className="text-sm font-medium text-gray-700">¿Primera vez? Descarga la plantilla</p>
                  <p className="text-xs text-gray-500">
                    Requeridas: <code className="bg-gray-200 px-1 rounded">nombre</code>{' '}
                    <code className="bg-gray-200 px-1 rounded">precioCompra</code>{' '}
                    <code className="bg-gray-200 px-1 rounded">precioVenta</code>{' '}
                    · Opcional: <code className="bg-gray-200 px-1 rounded">cantidad</code>
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                >
                  <Download size={13} /> Descargar Plantilla
                </button>
              </div>

              {/* Zona de carga */}
              <div
                className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                style={{ borderColor: file ? '#3b82f6' : '#d1d5db' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls,.csv" className="hidden" />
                {file ? (
                  <>
                    <FileSpreadsheet size={36} className="text-green-500 mb-2" />
                    <p className="font-medium text-gray-800">{fileName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {totalRows} productos · Encabezados detectados en fila {headerRowNum} · Haz clic para cambiar
                    </p>
                  </>
                ) : (
                  <>
                    <Upload size={36} className="text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600">Arrastra tu archivo o haz clic aquí</p>
                    <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv · Compatible con exportaciones de otros sistemas</p>
                  </>
                )}
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analizando estructura del archivo...
                </div>
              )}

              {/* Vista previa */}
              {showPreview && preview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Vista previa (primeras {preview.length} filas de {totalRows} total)
                      {invalidCount > 0 && <span className="text-amber-600 ml-2">{invalidCount} con advertencias</span>}
                    </p>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-xs divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Fila','Nombre','Código','P.Compra','P.Venta','Stock†','Estado'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.map((p, i) => (
                          <tr key={i} className={!p.valid ? 'bg-amber-50' : ''}>
                            <td className="px-3 py-1.5 text-gray-400">{p.rowIndex}</td>
                            <td className="px-3 py-1.5 font-medium max-w-[150px] truncate" title={p.name}>
                              {p.name || <span className="text-red-500 italic">vacío</span>}
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 text-xs">{p.barcode || '—'}</td>
                            <td className="px-3 py-1.5">
                              {p.purchasePrice > 0 ? `$${Number(p.purchasePrice).toFixed(2)}` : <span className="text-amber-500">—</span>}
                            </td>
                            <td className="px-3 py-1.5">
                              {p.salePrice > 0 ? `$${Number(p.salePrice).toFixed(2)}` : <span className="text-amber-500">—</span>}
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.excelQty > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {p.excelQty > 0 ? p.excelQty : '0'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              {p.valid
                                ? <span className="text-green-600 flex items-center gap-1"><Check size={11} /> OK</span>
                                : <span className="text-amber-600 text-xs">{p.errors.join(', ')}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    † Stock = columna "Cantidad" del archivo. Si no hay columna cantidad, el stock queda en 0.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="border-t p-4 flex justify-between items-center bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-400">
              {file && totalRows > 0 ? `${totalRows} productos listos para importar` : 'Selecciona un archivo Excel'}
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing || loading || detectedCols.name === -1}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  !file || importing || loading || detectedCols.name === -1
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {importing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importando {totalRows} productos...
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    {totalRows > 0 ? `Importar ${totalRows} productos` : 'Importar'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

ExcelImportModal.propTypes = {
  isOpen:   PropTypes.bool.isRequired,
  onClose:  PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired
};

export default ExcelImportModal;

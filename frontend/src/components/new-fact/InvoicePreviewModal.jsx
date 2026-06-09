/* eslint-disable no-unused-vars */
import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { useBusiness } from '../../context/BusinessContext'; // Importar el hook de BusinessContext
import { useAuth } from '../../context/AuthContext'; // Importar el hook de AuthContext

const InvoicePreviewModal = ({
  isOpen,
  onClose,
  invoiceData,
  businessInfo: propBusinessInfo,
  printConfig,
  onPrint
}) => {
  const invoiceRef = useRef(null);
  const barcodeRef  = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);
  // Usar el contexto de negocio para obtener la información más actualizada
  const { businessInfo: contextBusinessInfo, loading } = useBusiness();
  // Usar el contexto de autenticación para obtener la información del usuario
  const { user: authUser } = useAuth();
  
  // Usar el businessInfo del contexto si está disponible, sino usar el que viene por props o un valor por defecto
  const businessInfo = contextBusinessInfo || propBusinessInfo || {
    name: "Mi Negocio",
    address: "Dirección del Negocio",
    phone: "123-456-7890",
    taxId: "123456789",
    slogan: "¡Calidad y servicio garantizado!",
    currency: "RD$",
    taxRate: 18,
    includeTax: true,
    footer: "¡Gracias por su compra!",
    additionalComment: ""
  };

  // Depuración para verificar datos
  useEffect(() => {
    if (isOpen) {
      console.log("InvoicePreviewModal - Datos de factura:", invoiceData);
      console.log("InvoicePreviewModal - Datos de negocio:", businessInfo);
      const totals = calculateTotals();
      console.log("InvoicePreviewModal - Totales calculados:", totals);
    }
  }, [isOpen, invoiceData, businessInfo]);

  // Generar código de barras con el número de factura
  useEffect(() => {
    if (!isOpen || !barcodeRef.current || !invoiceData?.receiptNumber) return;
    try {
      JsBarcode(barcodeRef.current, invoiceData.receiptNumber, {
        format:       'CODE128',
        width:        1.4,
        height:       38,
        displayValue: false,
        margin:       4,
        background:   '#ffffff',
        lineColor:    '#000000',
      });
    } catch (e) {
      console.error('Error al generar código de barras:', e);
    }
  }, [isOpen, invoiceData?.receiptNumber]);

  // Modificar la configuración predeterminada para un tamaño más grande
  const loadPrintConfig = () => {
    if (printConfig) return printConfig;
    
    try {
      const savedConfig = localStorage.getItem('print_configuration_settings');
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('Error al cargar configuración de impresión:', error);
    }
    
    // Configuración predeterminada actualizada
    return {
      paperSize: 'receipt',
      paperWidth: 95, // Aumentado de 80 a 95mm
      paperHeight: 297, // Altura estándar A4
      paperOrientation: 'portrait',
      marginTop: 8,
      marginRight: 8,
      marginBottom: 8,
      marginLeft: 8,
      fontScale: 1.1 // Aumentado ligeramente
    };
  };

  const config = loadPrintConfig();

  // Función para formatear fechas
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    return new Date(dateString || Date.now()).toLocaleDateString('es-ES', options);
  };

  // Función para formatear hora
  const formatTime = (dateString) => {
    const options = { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true
    };
    return new Date(dateString || Date.now()).toLocaleTimeString('es-ES', options);
  };

  // Mejorar el cálculo de totales y cambio - Más robusto y con valores por defecto
  const calculateTotals = () => {
    const items = invoiceData?.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const taxRate = config.taxRate || 18;
    
    // Solo aplicar impuesto si viene especificado o si hay un valor existente
    let taxAmount = 0;
    if (invoiceData?.taxAmount !== undefined) {
      // Si tenemos un valor específico de taxAmount, usarlo
      taxAmount = invoiceData.taxAmount;
    } else if (invoiceData?.applyTax === true) {
      // Si applyTax es true, calcular el impuesto
      taxAmount = subtotal * taxRate / 100;
    }
    
    const total = invoiceData?.total || (subtotal + taxAmount);
    
    // Establecer un valor fijo de 0 para efectivo si no hay nada
    const cashValue = 0;
    
    // Intentar obtener el efectivo de cualquier ubicación posible, o usar valor por defecto
    let cashReceived = cashValue;
    if (invoiceData?.paymentDetails?.received && invoiceData.paymentDetails.received > 0) {
      cashReceived = Number(invoiceData.paymentDetails.received);
    } else if (invoiceData?.cashReceived && invoiceData.cashReceived > 0) {
      cashReceived = Number(invoiceData.cashReceived);
    } else if (invoiceData?.cash && invoiceData.cash > 0) {
      cashReceived = Number(invoiceData.cash);
    } else if (invoiceData?.paymentMethod === 'cash' && invoiceData?.paymentDetails?.cash && invoiceData.paymentDetails.cash > 0) {
      cashReceived = Number(invoiceData.paymentDetails.cash);
    }
    
    // Calcular el cambio como: efectivo - total
    let change = Math.max(0, cashReceived - total);
    
    // Si hay un valor explícito, usarlo
    if (typeof invoiceData?.paymentDetails?.change === 'number') {
      change = invoiceData.paymentDetails.change;
    } else if (typeof invoiceData?.change === 'number') {
      change = invoiceData.change;
    }
    
    // Depuración
    console.log("Cálculo detallado:", {
      itemsLength: items.length,
      subtotal,
      taxAmount,
      total,
      cashReceived,
      change
    });
    
    // Asegurarse de que sean valores numéricos y positivos
    return {
      subtotal: Math.max(0, Number(subtotal)),
      taxAmount: Math.max(0, Number(taxAmount)),
      total: Math.max(0, Number(total)),
      taxRate: Number(taxRate),
      cashReceived: Math.max(0, Number(cashReceived)),
      change: Math.max(0, Number(change))
    };
  };

  // Estilo del contenedor: ancho fijo según papel, altura libre (el contenido determina la altura)
  const getInvoiceContainerStyle = () => {
    let width;

    if (config.paperSize === 'a4') {
      width = config.paperOrientation === 'landscape' ? 297 : 210;
    } else if (config.paperSize === 'letter') {
      width = config.paperOrientation === 'landscape' ? 279 : 216;
    } else {
      // receipt o custom
      width = config.paperWidth || 95;
    }

    const mmToPx = 3.7795275591;
    const widthPx = width * mmToPx;
    const marginTop    = (config.marginTop    || 8) * mmToPx;
    const marginRight  = (config.marginRight  || 8) * mmToPx;
    const marginBottom = (config.marginBottom || 8) * mmToPx;
    const marginLeft   = (config.marginLeft   || 8) * mmToPx;
    const fontScale    = config.fontScale || 1.1;

    return {
      width: `${widthPx}px`,
      maxWidth: '100%',
      // Sin height fijo ni overflow: el contenido fluye completo y html2canvas lo captura íntegro
      padding: `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`,
      fontSize: `${fontScale}rem`,
      lineHeight: '1.4',
      backgroundColor: 'white',
      boxSizing: 'border-box',
      margin: '0 auto',
      border: '1px solid #ddd',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };
  };

  // Captura el elemento completo (sin restricciones de scroll) y retorna canvas
  const captureFullElement = async (element) => {
    return html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });
  };

  // Descargar como PDF con altura dinámica y soporte multi-página
  const downloadAsPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await captureFullElement(invoiceRef.current);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      let options;
      let pdfWidth;

      if (config.paperSize === 'a4') {
        options = { orientation: config.paperOrientation || 'portrait', unit: 'mm', format: 'a4' };
        pdfWidth = config.paperOrientation === 'landscape' ? 297 : 210;
      } else if (config.paperSize === 'letter') {
        options = { orientation: config.paperOrientation || 'portrait', unit: 'mm', format: 'letter' };
        pdfWidth = config.paperOrientation === 'landscape' ? 279 : 216;
      } else {
        // receipt o custom: la página se ajusta exactamente al contenido capturado
        pdfWidth = config.paperWidth || 80;
        const pdfHeight = (canvas.height / canvas.width) * pdfWidth;
        options = { orientation: 'portrait', unit: 'mm', format: [pdfWidth, Math.max(pdfHeight, 50)] };
      }

      const pdf = new jsPDF(options);
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Altura de la imagen escalada al ancho de página
      const imgH = (canvas.height / canvas.width) * pageW;

      if (imgH <= pageH) {
        // Cabe en una sola página
        pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);
      } else {
        // Contenido más alto que la página: dividir en múltiples páginas
        let yRendered = 0;
        let pageNum = 0;
        const scale = canvas.width / pageW; // px por mm

        while (yRendered < imgH) {
          const sliceH = Math.min(pageH, imgH - yRendered);
          const slicePx = Math.round(sliceH * scale);
          const srcY   = Math.round(yRendered * scale);

          const tmp = document.createElement('canvas');
          tmp.width  = canvas.width;
          tmp.height = slicePx;
          const ctx = tmp.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, tmp.width, tmp.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

          if (pageNum > 0) pdf.addPage();
          pdf.addImage(tmp.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, sliceH);

          yRendered += sliceH;
          pageNum++;
        }
      }

      pdf.save(`Factura_${invoiceData?.receiptNumber || 'sin_numero'}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('No se pudo generar el PDF. Por favor, intente nuevamente.');
    }
  };

  // Determina el valor CSS de @page size según la configuración activa
  const getPageSizeCSS = () => {
    if (config.paperSize === 'a4') {
      return `A4 ${config.paperOrientation || 'portrait'}`;
    }
    if (config.paperSize === 'letter') {
      return `letter ${config.paperOrientation || 'portrait'}`;
    }
    // receipt / custom: ancho fijo, alto automático (impresora térmica)
    const w = config.paperWidth || 80;
    return `${w}mm auto`;
  };

  // Imprime capturando el preview completo (iframe invisible, sin abrir ventana nueva)
  const handlePrintFromPreview = async () => {
    if (!invoiceRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
      const canvas = await captureFullElement(invoiceRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pageSizeCSS = getPageSizeCSS();

      const printWithIframe = () => new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open('text/html', 'replace');
        doc.write(`<!DOCTYPE html><html><head><style>
          *{margin:0;padding:0;box-sizing:border-box;}
          @page{size:${pageSizeCSS};margin:0;}
          html,body{background:#fff;width:100%;}
          img{width:100%;height:auto;display:block;page-break-inside:avoid;}
        </style></head><body><img src="${imgData}" /></body></html>`);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            try { document.body.removeChild(iframe); } catch (_) {}
            resolve();
          }, 1500);
        }, 500);
      });

      await printWithIframe();

      // Segunda copia automática para facturas a crédito/fiado
      if (isCredit) {
        await new Promise(r => setTimeout(r, 1200));
        await printWithIframe();
      }
    } catch (err) {
      console.error('Error al imprimir:', err);
      alert('No se pudo imprimir. Intente nuevamente.');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  const { subtotal, taxAmount, total, taxRate, cashReceived, change } = calculateTotals();
  const currencySymbol = businessInfo?.currency || 'RD$';
  const paymentMethod = invoiceData?.paymentMethod || 'cash';
  const isCredit = invoiceData?.isCredit || paymentMethod === 'credit';

  // Cargar configuración NCF/DGII desde localStorage
  let ncfConfig = null;
  try {
    const raw = localStorage.getItem('dgii_ncf_config');
    if (raw) ncfConfig = JSON.parse(raw);
  } catch (_) { /* sin NCF */ }
  const ncfEnabled = ncfConfig?.enabled && ncfConfig?.currentSequence;
  const ncfNumber  = ncfEnabled
    ? `${ncfConfig.defaultType}${String(ncfConfig.currentSequence).padStart(ncfConfig.defaultType?.startsWith('E') ? 10 : 8, '0')}`
    : null;

  // Obtener información del usuario actual (cajero)
  // Prioridad: 1. invoiceData.cashierName (si viene en los datos de la factura)
  //           2. authUser del contexto de autenticación
  //           3. currentUser del localStorage (como respaldo)
  //           4. Valor por defecto
  const currentUser = localStorage.getItem('currentUser') ? 
    JSON.parse(localStorage.getItem('currentUser')) : null;
  const storedUser = localStorage.getItem('user') ? 
    JSON.parse(localStorage.getItem('user')) : null;
    
  const userName = invoiceData?.cashierName || 
    (authUser?.name || authUser?.username || authUser?.email) || 
    (storedUser?.name || storedUser?.username || storedUser?.email) ||
    (currentUser?.name || currentUser?.username || currentUser?.email) || 
    'No identificado';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl p-6 max-w-5xl w-full mx-4 my-8"
        >
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">Vista Previa de Factura</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="border rounded-lg shadow-sm overflow-auto max-h-[80vh] bg-gray-100 p-4">
            <div className="flex justify-center">
              <div ref={invoiceRef} style={getInvoiceContainerStyle()} className="bg-white shadow-sm">
                {/* Encabezado - Modificado para usar BusinessContext */}
                <div className="text-center mb-3">
                  <h1 className="text-xl font-bold mb-1">{businessInfo?.name || 'Super Mercado Aqui!'}</h1>
                  <p className="text-sm mb-0.5">{businessInfo?.address || 'C/ Duarte #22 santo domingo'}</p>
                  <p className="text-sm mb-0.5">TEL: {businessInfo?.phone || '809-896-6366'}</p>
                  <p className="text-sm">RNC: {businessInfo?.taxId || '132-85683-1'}</p>
                  <hr className="my-2 border-t border-gray-300" />
                </div>

                {/* Información de la factura - Reformateado para parecerse a la imagen */}
                <div className="text-sm mb-2">
                  <div className="flex justify-between">
                    <span>Fecha: {formatDate(invoiceData?.dateTime)}</span>
                    <span>Hora: {formatTime(invoiceData?.dateTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cajero: {userName}</span>
                    <span>Factura</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cliente: {isCredit ? (invoiceData?.clientName || 'Cliente Fiado') : 'Cliente General'}</span>
                    <span>RNC: {invoiceData?.customer?.rncCedula || '130266831'}</span>
                  </div>

                  {/* Número de factura + NCF si está habilitado */}
                  <div className="mt-1 mb-2 space-y-0.5">
                    <div>
                      <span className="font-bold">Factura Nº: {invoiceData?.receiptNumber || 'FAC-202504-0105'}</span>
                    </div>
                    {ncfNumber && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700">NCF: {ncfNumber}</span>
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          {ncfConfig?.usesECF ? 'e-CF' : 'Fiscal'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Marca para compra fiada */}
                  {isCredit && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-1 rounded text-center my-2">
                      <p className="font-bold">COMPRA FIADA</p>
                      <p className="text-sm">{invoiceData?.clientName || 'Cliente'}</p>
                    </div>
                  )}
                </div>

                {/* Tabla de productos - Mejorada para mostrar correctamente los nombres de productos */}
                <div className="mb-3">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-t border-b border-gray-300">
                        <th className="text-left py-1 text-sm font-semibold">Descripción</th>
                        <th className="text-center py-1 text-sm font-semibold">Cant.</th>
                        <th className="text-right py-1 text-sm font-semibold">Precio</th>
                        <th className="text-right py-1 text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoiceData?.items || []).map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="text-left py-1 text-sm">
                            {/* Mostrar nombre del producto, o descripción, o información de producto */}
                            {item.name || 
                             (item.product && typeof item.product === 'object' ? item.product.name : '') || 
                             item.description || 
                             'Producto'}
                          </td>
                          <td className="text-center py-1 text-sm">
                            {typeof item.quantity === 'number' ? 
                              Number(item.quantity).toLocaleString('es-DO', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 3
                              }) : 
                              item.quantity
                            }
                          </td>
                          <td className="text-right py-1 text-sm">
                            {currencySymbol}{Number(item.price).toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </td>
                          <td className="text-right py-1 text-sm">
                            {currencySymbol}{Number(item.subtotal).toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sección de totales - Reorganizado como en la imagen */}
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Sub-total:</span>
                    <span>{currencySymbol}{subtotal.toLocaleString('es-DO', {
                      minimumFractionDigits: 2
                    })}</span>
                  </div>
                  
                  {taxAmount > 0 && (
                    <div className="flex justify-between mb-1">
                      <span>ITBIS ({taxRate}%):</span>
                      <span>{currencySymbol}{taxAmount.toLocaleString('es-DO', {
                        minimumFractionDigits: 2
                      })}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-base mb-1 mt-1 pt-1 border-t border-gray-300">
                    <span>TOTAL:</span>
                    <span>{currencySymbol}{total.toLocaleString('es-DO', {
                      minimumFractionDigits: 2
                    })}</span>
                  </div>
                </div>

                {/* Información de pago - SIEMPRE mostrar campos sin condiciones */}
                <div className="mt-2 pt-1 border-t border-gray-300 text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Método de pago:</span>
                    <span>{(() => {
                      switch(paymentMethod) {
                        case 'cash': return 'Efectivo';
                        case 'card': return 'Tarjeta';
                        case 'transfer': return 'Transferencia';
                        case 'credit': return 'Crédito (Fiado)';
                        default: return 'Efectivo';
                      }
                    })()}</span>
                  </div>
                  
                  {/* Efectivo y cambio - SIEMPRE mostrar */}
                  <div className="flex justify-between mb-1 font-bold">
                    <span>CANT. EFECTIVO:</span>
                    <span>{currencySymbol}{cashReceived.toLocaleString('es-DO', {
                      minimumFractionDigits: 2
                    })}</span>
                  </div>
                  <div className="flex justify-between mb-1 font-bold">
                    <span>DEVUELTA:</span>
                    <span>{currencySymbol}{change.toLocaleString('es-DO', {
                      minimumFractionDigits: 2
                    })}</span>
                  </div>
                  
                  {/* Información adicional para compras fiadas */}
                  {isCredit && (
                    <div className="flex justify-between mb-1">
                      <span>Estado:</span>
                      <span>Pendiente de pago</span>
                    </div>
                  )}
                </div>

                {/* Comentario adicional - Si existe */}
                {businessInfo?.additionalComment && (
                  <div className="text-center mt-2 pt-1 text-sm border-t border-gray-200">
                    <p className="italic">{businessInfo.additionalComment}</p>
                  </div>
                )}

                {/* Pie de página */}
                <div className="text-center border-t border-gray-300 mt-3 pt-2">
                  {isCredit && (
                    <div className="mb-2 p-1 border border-gray-300 rounded">
                      <p className="font-bold text-sm">COMPROBANTE DE DEUDA</p>
                      <p className="text-xs">Esta factura representa una deuda pendiente de pago.</p>
                    </div>
                  )}
                  <p className="font-semibold text-sm">{businessInfo?.footer || '¡Gracias por su compra!'}</p>

                  {/* Código de barras con número de factura */}
                  <div className="mt-3 flex flex-col items-center">
                    <svg ref={barcodeRef} className="max-w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 mt-4">
            <button
              onClick={handlePrintFromPreview}
              disabled={isPrinting}
              className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Printer size={20} className="mr-2" />
              {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
            </button>
            <button
              onClick={downloadAsPDF}
              className="flex items-center px-6 py-2.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Download size={20} className="mr-2" />
              Descargar PDF
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

InvoicePreviewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  invoiceData: PropTypes.object,
  businessInfo: PropTypes.object,
  printConfig: PropTypes.object,
  onPrint: PropTypes.func.isRequired
};

export default InvoicePreviewModal;
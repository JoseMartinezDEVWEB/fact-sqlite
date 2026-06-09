import { useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Componente para exportar reportes en diferentes formatos
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título del reporte
 * @param {string} props.filename - Nombre del archivo sin extensión
 * @param {Array} props.data - Datos para exportar
 * @param {Array} props.columns - Configuración de columnas
 * @param {Object} props.summary - Datos de resumen
 * @param {Object} props.config - Configuración adicional
 */

// Helper para PDF
function generatePDF({ title, filename, data, columns, summary, config }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(title, pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Generado el ${dateStr}`, pageWidth / 2, 28, { align: 'center' });
  const tableData = data.map(item => columns.map(col => (col.format && typeof col.format === 'function') ? col.format(item[col.dataKey]) : item[col.dataKey]));
  const tableHeaders = columns.map(col => col.title);
  doc.autoTable({
    head: [tableHeaders],
    body: tableData,
    startY: 35,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
    headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });
  if (summary && Object.keys(summary).length > 0) {
    const currentY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text('Resumen', 14, currentY);
    doc.setFontSize(10);
    let summaryY = currentY + 8;
    Object.entries(summary).forEach(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/Total/g, 'Total de');
      let formattedValue = value;
      const column = columns.find(col => col.dataKey === key);
      if (column && column.format && typeof column.format === 'function') {
        formattedValue = column.format(value);
      }
      doc.text(`${formattedKey}: ${formattedValue}`, 14, summaryY);
      summaryY += 6;
    });
  }
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount} - ${config.companyName || 'App Facturación'}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  doc.save(`${filename}.pdf`);
}

// Helper para Excel
function generateExcel({ filename, data, columns, summary }) {
  const excelData = data.map(item => {
    const row = {};
    columns.forEach(col => {
      if (col.rawDataKey) {
        row[col.title] = item[col.rawDataKey];
      } else {
        row[col.title] = item[col.dataKey];
      }
    });
    return row;
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  if (summary && Object.keys(summary).length > 0) {
    XLSX.utils.sheet_add_aoa(ws, [[''], ['Resumen:']], { origin: -1 });
    const summaryRows = Object.entries(summary).map(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/Total/g, 'Total de');
      let rawValue = value;
      const column = columns.find(col => col.dataKey === key && col.rawDataKey);
      if (column && column.rawDataKey) {
        const originalItem = data.find(item => item[column.rawDataKey] !== undefined);
        if (originalItem) {
          rawValue = originalItem[column.rawDataKey];
        }
      }
      return [formattedKey, rawValue];
    });
    XLSX.utils.sheet_add_aoa(ws, summaryRows, { origin: -1 });
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
  </svg>
);

const ReportExport = ({ 
  title, 
  filename = 'reporte', 
  data = [], 
  columns = [], 
  summary = null,
  config = {}
}) => {
  const [loading, setLoading] = useState(false);
  const [fileNameInput, setFileNameInput] = useState(filename);
  const [error, setError] = useState('');

  const exportToPDF = () => {
    setLoading(true);
    setError('');
    try {
      generatePDF({ title, filename: fileNameInput, data, columns, summary, config });
    } catch (err) {
      setError('Error al generar el PDF. Intente nuevamente.');
      console.error('Error al exportar a PDF:', err);
    } finally {
      setLoading(false);
    }
  };
  const exportToExcel = () => {
    setLoading(true);
    setError('');
    try {
      generateExcel({ filename: fileNameInput, data, columns, summary });
    } catch (err) {
      setError('Error al generar el archivo Excel. Intente nuevamente.');
      console.error('Error al exportar a Excel:', err);
    } finally {
      setLoading(false);
    }
  };
  const printReport = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={fileNameInput}
          onChange={e => setFileNameInput(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
          placeholder="Nombre del archivo"
          aria-label="Nombre del archivo"
        />
        {loading && <Spinner />}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={exportToPDF}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          {loading ? 'Generando...' : 'Exportar PDF'}
        </button>
        <button
          onClick={exportToExcel}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? 'Generando...' : 'Exportar Excel'}
        </button>
        <button
          onClick={printReport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Imprimir
        </button>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
};

export default ReportExport;

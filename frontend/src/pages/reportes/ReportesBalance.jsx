import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getBalanceReport, getGastosReport, getDeudasReport } from '../../services/reportService';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Modal } from '../../components/Modal';
import api from '../../config/axiosConfig';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { getFacturas } from '../../services/facturasService';
import { getInvoices } from '../../services/invoiceService';
import * as XLSX from 'xlsx';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportesBalance = () => {
  const [periodo, setPeriodo] = useState('mensual');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [balanceDiario, setBalanceDiario] = useState([]);
  const [balancePorMetodoPago, setBalancePorMetodoPago] = useState([]);
  const [resumen, setResumen] = useState({
    totalIngresos: 0,
    totalGastos: 0,
    totalVentas: 0,
    totalEfectivo: 0,
    totalTarjeta: 0,
    totalTransferencia: 0,
    totalCredito: 0,
    totalDeudasPendientes: 0,
    totalDeudaProveedores: 0
  });
  const [gastosPorCategoria, setGastosPorCategoria] = useState([]);
  const [detalleGastos, setDetalleGastos] = useState([]);
  const [deudaProveedores, setDeudaProveedores] = useState(0);
  const [facturasFiadas, setFacturasFiadas] = useState(0);
  const [ventasDelivery, setVentasDelivery] = useState({ count: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const pdfBlobRef = useRef(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingDeudaProveedores, setLoadingDeudaProveedores] = useState(false);
  const [errorDeudaProveedores, setErrorDeudaProveedores] = useState(null);

  // Establecer fechas por defecto al cargar el componente
  useEffect(() => {
    const today = new Date();
    
    if (periodo === 'semanal') {
      const inicio = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
      const fin = endOfWeek(today, { weekStartsOn: 1 }); // Domingo
      setFechaInicio(format(inicio, 'yyyy-MM-dd'));
      setFechaFin(format(fin, 'yyyy-MM-dd'));
    } else if (periodo === 'mensual') {
      const inicio = startOfMonth(today);
      const fin = endOfMonth(today);
      setFechaInicio(format(inicio, 'yyyy-MM-dd'));
      setFechaFin(format(fin, 'yyyy-MM-dd'));
    }
  }, [periodo]);

  // Cargar datos cuando cambian las fechas o el periodo
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      fetchBalanceData();
    }
  }, [fechaInicio, fechaFin]);

  const fetchBalanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener datos de balance usando el servicio
      const balanceRes = await getBalanceReport({
        startDate: fechaInicio,
        endDate: fechaFin
      });
      
      const gastosRes = await getGastosReport({
        startDate: fechaInicio,
        endDate: fechaFin
      });
      
      const deudasRes = await getDeudasReport({ tipo: 'todas' });
      
      console.log('Datos de balance:', balanceRes);
      
      if (balanceRes.success && balanceRes.data) {
        const { balanceDiario, resumen: resumenBalance } = balanceRes.data;
        
        // Formatear datos para el gráfico diario
        const formattedDiario = balanceDiario.map(item => ({
          fecha: format(parseISO(item.fecha), 'dd/MM/yyyy'),
          ingresos: item.ingresos,
          gastos: item.gastos,
          ganancias: item.ingresos - item.gastos
        }));
        
        // Si el backend NO envía los totales por método de pago, calcularlos manualmente
        let metodoPago = [
          { name: 'Efectivo', value: resumenBalance?.totalEfectivo || 0 },
          { name: 'Tarjeta', value: resumenBalance?.totalTarjeta || 0 },
          { name: 'Transferencia', value: resumenBalance?.totalTransferencia || 0 },
          { name: 'Crédito', value: resumenBalance?.totalCredito || 0 }
        ];
        const sumaMetodos = metodoPago.reduce((sum, m) => sum + m.value, 0);
        if (!sumaMetodos) {
          // Si no hay datos, obtener facturas y sumar manualmente
          const facturasRes = await getFacturas();
          const facturas = facturasRes.data || facturasRes || [];
          let efectivo = 0, tarjeta = 0, transferencia = 0, credito = 0;
          facturas.filter(f => f.status === 'completed' && new Date(f.dateTime) >= new Date(fechaInicio) && new Date(f.dateTime) <= new Date(fechaFin)).forEach(f => {
            if (f.paymentMethod === 'cash') efectivo += f.cash || f.paidAmount || f.total || 0;
            if (f.paymentMethod === 'credit_card') tarjeta += f.paidAmount || f.total || 0;
            if (f.paymentMethod === 'bank_transfer') transferencia += f.paidAmount || f.total || 0;
            if (f.paymentMethod === 'credit') credito += f.paidAmount || f.total || 0;
          });
          metodoPago = [
            { name: 'Efectivo', value: efectivo },
            { name: 'Tarjeta', value: tarjeta },
            { name: 'Transferencia', value: transferencia },
            { name: 'Crédito', value: credito }
          ];
        }
        setBalancePorMetodoPago(metodoPago);
        setResumen(prev => ({
          ...prev,
          totalIngresos: resumenBalance.totalIngresos || resumenBalance.ingresoTotal || 0,
          totalGastos: resumenBalance.totalGastos || resumenBalance.gastoTotal || 0,
          totalVentas: resumenBalance.totalGanancias || resumenBalance.gananciaTotal || 0,
          totalEfectivo: resumenBalance.totalEfectivo || 0,
          totalTarjeta: resumenBalance.totalTarjeta || 0,
          totalTransferencia: resumenBalance.totalTransferencia || 0,
          totalCredito: resumenBalance.totalCredito || 0,
          totalDeudasPendientes: resumenBalance.totalDeudasPendientes || 0
        }));
      }
      
      if (gastosRes.success && gastosRes.data) {
        setGastosPorCategoria(gastosRes.data.porCategoria || []);
        setDetalleGastos(gastosRes.data.gastos || []);
      }
      
      if (deudasRes.success && deudasRes.data) {
        // Filtrar deudas a proveedores SOLO del rango de fechas seleccionado
        const deudasProveedoresFiltradas = (deudasRes.data.deudas || []).filter(d => {
          if (d.tipo !== 'proveedor') return false;
          const fecha = new Date(d.fechaCreacion);
          return fecha >= new Date(fechaInicio) && fecha <= new Date(fechaFin);
        });
        const totalFiadas = (deudasRes.data.deudas || []).filter(d => d.tipo === 'cliente').reduce((sum, d) => sum + d.pendiente, 0);
        setFacturasFiadas(totalFiadas);
      }

      // Obtener ventas delivery del periodo
      try {
        const deliveryRes = await getInvoices({
          isDelivery: true,
          startDate: fechaInicio,
          endDate: fechaFin,
          limit: 1000
        });
        const deliveryFacturas = deliveryRes.data || [];
        const deliveryTotal = deliveryFacturas.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
        setVentasDelivery({ count: deliveryRes.totalItems || deliveryFacturas.length, total: deliveryTotal });
      } catch {
        setVentasDelivery({ count: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error al obtener datos de balance:', error);
      setError('Error al cargar los datos de balance. Intente nuevamente.');
      
      // Datos de ejemplo para desarrollo
      const demoData = generarDatosDemostracion();
      setBalanceDiario(demoData.balanceDiario);
      setBalancePorMetodoPago(demoData.balancePorMetodoPago);
      setResumen(demoData.resumen);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar datos de demostración
  const generarDatosDemostracion = () => {
    // Generar balance diario
    const balanceDiario = [];
    const inicio = parseISO(fechaInicio);
    const fin = parseISO(fechaFin);
    let currentDate = inicio;
    
    let totalIngresos = 0;
    let totalGastos = 0;
    
    while (currentDate <= fin) {
      const ingresos = Math.floor(Math.random() * 20000) + 5000;
      const gastos = Math.floor(Math.random() * 10000) + 2000;
      
      balanceDiario.push({
        fecha: format(currentDate, 'dd/MM/yyyy'),
        ingresos,
        gastos,
        ganancias: ingresos - gastos
      });
      
      totalIngresos += ingresos;
      totalGastos += gastos;
      
      // Avanzar al siguiente día
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calcular totales por método de pago
    const totalEfectivo = Math.round(totalIngresos * 0.4);
    const totalTarjeta = Math.round(totalIngresos * 0.3);
    const totalTransferencia = Math.round(totalIngresos * 0.2);
    const totalCredito = Math.round(totalIngresos * 0.1);
    
    // Formatear datos para el gráfico por método de pago
    const balancePorMetodoPago = [
      { name: 'Efectivo', value: totalEfectivo },
      { name: 'Tarjeta', value: totalTarjeta },
      { name: 'Transferencia', value: totalTransferencia },
      { name: 'Crédito', value: totalCredito }
    ];
    
    return {
      balanceDiario,
      balancePorMetodoPago,
      resumen: {
        totalIngresos,
        totalGastos,
        totalVentas: totalIngresos - totalGastos,
        totalEfectivo,
        totalTarjeta,
        totalTransferencia,
        totalCredito,
        totalDeudasPendientes: Math.round(totalCredito * 0.7) // 70% del crédito aún pendiente
      }
    };
  };

  // Función para formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(value);
  };

  // Función para generar PDF
  const generarPDF = (download = false) => {
    const doc = new jsPDF();
    // Título
    doc.setFontSize(18);
    doc.text('Balance General', 105, 15, { align: 'center' });
    // Periodo
    doc.setFontSize(12);
    doc.text(`Periodo: ${format(parseISO(fechaInicio), 'dd/MM/yyyy')} - ${format(parseISO(fechaFin), 'dd/MM/yyyy')}`, 105, 25, { align: 'center' });
    // Resumen
    doc.setFontSize(14);
    doc.text('Resumen Financiero', 14, 35);
    const resumenData = [
      ['Total Ingresos', formatCurrency(resumen.totalIngresos)],
      ['Total Gastos', formatCurrency(resumen.totalGastos)],
      ['Total Ventas', formatCurrency(resumen.totalVentas)],
      ['Facturas Fiadas/Pendientes', formatCurrency(facturasFiadas)],
      ['Deuda a Proveedores', formatCurrency(deudaProveedores)],
      ['Total Efectivo', formatCurrency(resumen.totalEfectivo)],
      ['Total Tarjeta', formatCurrency(resumen.totalTarjeta)],
      ['Total Transferencia', formatCurrency(resumen.totalTransferencia)],
      ['Total Crédito', formatCurrency(resumen.totalCredito)],
      ['Ventas Delivery/Mensajero', `${ventasDelivery.count} pedidos — ${formatCurrency(ventasDelivery.total)}`]
    ];
    doc.autoTable({
      startY: 40,
      head: [['Concepto', 'Valor']],
      body: resumenData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
      doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 292, { align: 'center' });
    }
    if (download) {
      doc.save(`Balance_General_${fechaInicio}_${fechaFin}.pdf`);
    } else {
      // Mostrar en modal
      const pdfBlob = doc.output('blob');
      if (pdfBlobRef.current) URL.revokeObjectURL(pdfBlobRef.current);
      const url = URL.createObjectURL(pdfBlob);
      pdfBlobRef.current = url;
      setPdfUrl(url);
      setShowPdfModal(true);
    }
  };

  // ── Exportar Balance como Excel ──────────────────────────────────────
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen del mes/período
    const resumenRows = [
      ['BALANCE GENERAL', ''],
      [`Período: ${fechaInicio} → ${fechaFin}`, ''],
      ['', ''],
      ['Concepto', 'Valor (RD$)'],
      ['Total Ingresos',      resumen.totalIngresos],
      ['Total Gastos',        resumen.totalGastos],
      ['Balance Neto',        resumen.totalVentas],
      ['Facturas Fiadas',     facturasFiadas],
      ['Deuda Proveedores',   deudaProveedores],
      ['Ventas Efectivo',     resumen.totalEfectivo],
      ['Ventas Tarjeta',      resumen.totalTarjeta],
      ['Ventas Transferencia',resumen.totalTransferencia],
      ['Ventas Crédito',      resumen.totalCredito],
      ['Delivery — Pedidos',  ventasDelivery.count],
      ['Delivery — Total',    ventasDelivery.total],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
    wsResumen['!cols'] = [{ wch: 28 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Hoja 2: Balance diario
    if (balanceDiario.length) {
      const ws2 = XLSX.utils.json_to_sheet(balanceDiario.map(d => ({
        'Fecha': d.fecha, 'Ingresos': d.ingresos, 'Gastos': d.gastos, 'Ganancias': d.ganancias
      })));
      ws2['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Balance Diario');
    }

    // Hoja 3: Por método de pago
    if (balancePorMetodoPago.length) {
      const ws3 = XLSX.utils.json_to_sheet(balancePorMetodoPago.map(m => ({
        'Método': m.name, 'Total': m.value
      })));
      XLSX.utils.book_append_sheet(wb, ws3, 'Método de Pago');
    }

    // Hoja 4: Gastos por categoría
    if (gastosPorCategoria.length) {
      const ws4 = XLSX.utils.json_to_sheet(gastosPorCategoria);
      XLSX.utils.book_append_sheet(wb, ws4, 'Gastos x Categoría');
    }

    XLSX.writeFile(wb, `Balance_${fechaInicio}_${fechaFin}.xlsx`);
  };

  // ── Exportar backup del balance (formato JSON importable) ─────────────
  const exportarBackupJSON = () => {
    const backup = {
      version:   '1.0',
      tipo:      'balance_general',
      exportado: new Date().toISOString(),
      periodo:   { inicio: fechaInicio, fin: fechaFin },
      resumen,
      balanceDiario,
      balancePorMetodoPago,
      gastosPorCategoria,
      detalleGastos,
      extras: { facturasFiadas, deudaProveedores, ventasDelivery }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `backup_balance_${fechaInicio}_${fechaFin}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Importar backup JSON ──────────────────────────────────────────────
  const [importando, setImportando] = useState(false);
  const [importMsg,  setImportMsg]  = useState('');
  const importRef = useRef(null);

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setImportMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.tipo !== 'balance_general') throw new Error('Archivo no reconocido como backup de balance');

        // Restaurar estados
        if (data.resumen)            setResumen(data.resumen);
        if (data.balanceDiario)      setBalanceDiario(data.balanceDiario);
        if (data.balancePorMetodoPago) setBalancePorMetodoPago(data.balancePorMetodoPago);
        if (data.gastosPorCategoria) setGastosPorCategoria(data.gastosPorCategoria);
        if (data.detalleGastos)      setDetalleGastos(data.detalleGastos);
        if (data.extras?.facturasFiadas  !== undefined) setFacturasFiadas(data.extras.facturasFiadas);
        if (data.extras?.deudaProveedores !== undefined) setDeudaProveedores(data.extras.deudaProveedores);
        if (data.extras?.ventasDelivery)  setVentasDelivery(data.extras.ventasDelivery);
        if (data.periodo?.inicio) setFechaInicio(data.periodo.inicio);
        if (data.periodo?.fin)    setFechaFin(data.periodo.fin);

        setImportMsg(`✅ Backup del ${data.periodo?.inicio} al ${data.periodo?.fin} importado correctamente.`);
      } catch (err) {
        setImportMsg(`❌ Error al importar: ${err.message}`);
      } finally {
        setImportando(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Renderizador personalizado para las etiquetas del gráfico de pastel
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Nueva función robusta para obtener la deuda de proveedores
  const obtenerDeudaProveedores = async (fechaInicio, fechaFin) => {
    setLoadingDeudaProveedores(true);
    setErrorDeudaProveedores(null);
    try {
      // Llamada optimizada al backend, pasando el rango de fechas si el endpoint lo soporta
      const response = await api.get('/suppliers/stats', {
        params: { startDate: fechaInicio, endDate: fechaFin }
      });
      if (response.data && response.data.data && typeof response.data.data.totalDebt === 'number') {
        setDeudaProveedores(response.data.data.totalDebt);
      } else {
        // Fallback: obtener todos los proveedores y sumar la deuda manualmente
        const respAll = await api.get('/suppliers');
        const proveedores = respAll.data?.data || [];
        const total = proveedores.reduce((sum, p) => sum + (p.currentDebt || 0), 0);
        setDeudaProveedores(total);
      }
    } catch (error) {
      setErrorDeudaProveedores('Error al obtener la deuda de proveedores');
      setDeudaProveedores(0);
    } finally {
      setLoadingDeudaProveedores(false);
    }
  };

  // Llamar a la función robusta cuando cambian las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      obtenerDeudaProveedores(fechaInicio, fechaFin);
    }
  }, [fechaInicio, fechaFin]);

  const recargarBalance = async () => {
    setLoadingBalance(true);
    await fetchBalanceData();
    setLoadingBalance(false);
  };

  return (
    <>
      <Helmet>
        <title>Balance General | App Facturación</title>
      </Helmet>
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Balance General</h1>
          <button
            onClick={recargarBalance}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60"
            title="Actualizar Balance General"
            disabled={loadingBalance}
          >
            {loadingBalance ? (
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
            ) : (
              <RefreshIcon fontSize="small" />
            )}
            Actualizar Balance
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Balance General
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Selector de periodo */}
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="form-select rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
            >
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="personalizado">Personalizado</option>
            </select>
            
            {/* Fechas personalizadas */}
            {periodo === 'personalizado' && (
              <>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="form-input rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="form-input rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </>
            )}
            
            {/* Botón PDF */}
            <button onClick={() => generarPDF(false)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/></svg>
              Ver PDF
            </button>
            {/* Botón descargar PDF */}
            <button onClick={() => generarPDF(true)}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              PDF
            </button>
            {/* Botón Excel */}
            <button onClick={exportarExcel}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/></svg>
              Excel
            </button>
            {/* Botón Backup JSON */}
            <button onClick={exportarBackupJSON}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-1"
              title="Exportar backup importable al sistema">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              Backup
            </button>
            {/* Botón Importar Backup */}
            <label className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center gap-1 cursor-pointer"
              title="Importar backup del balance">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17H5a2 2 0 01-2-2V9a2 2 0 012-2h3m0 8l3-3m0 0l3 3m-3-3v-9"/></svg>
              Importar
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
            </label>
          </div>
        </div>

        {/* Mensaje de importación */}
        {importMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${importMsg.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {importMsg}
            <button onClick={() => setImportMsg('')} className="ml-3 text-xs underline">Cerrar</button>
          </div>
        )}
        
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500">Total Ingresos</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(resumen.totalIngresos)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500">Total Gastos</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(resumen.totalGastos)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500">Total Ventas</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(resumen.totalVentas)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500">Facturas Fiadas/Pendientes</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(facturasFiadas)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500">Deuda a Proveedores</h3>
            {loadingDeudaProveedores ? (
              <span className="text-gray-400">Cargando...</span>
            ) : errorDeudaProveedores ? (
              <span className="text-red-500">{errorDeudaProveedores}</span>
            ) : (
              <p className="text-xl font-bold text-gray-800">{formatCurrency(deudaProveedores)}</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <h3 className="text-sm font-medium text-gray-500">Ventas Delivery / Mensajero</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(ventasDelivery.total)}</p>
            <p className="text-xs text-gray-500 mt-1">{ventasDelivery.count} pedido{ventasDelivery.count !== 1 ? 's' : ''} en el periodo</p>
          </div>
        </div>
        
        {/* Gráfico de balance diario */}
        {	/*<div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Balance Diario</h3>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-4">{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={balanceDiario}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill="#4ade80" />
                <Bar dataKey="gastos" name="Gastos" fill="#f87171" />
                <Bar dataKey="ganancias" name="Ganancias" fill="#60a5fa" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>*/}
        
        {/* Gráficos de métodos de pago y distribución */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de métodos de pago */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ingresos por Método de Pago</h3>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-4">{error}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={balancePorMetodoPago}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {balancePorMetodoPago.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Tabla de métodos de pago */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalle por Método de Pago</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método de Pago</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Porcentaje</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {balancePorMetodoPago.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.value)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {((item.value / resumen.totalIngresos) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalIngresos)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        
        {/* Tabla de balance diario */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalle de Balance Diario</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gastos</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancias</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {balanceDiario.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.fecha}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.ingresos)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.gastos)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${item.ganancias >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(item.ganancias)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalIngresos)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalGastos)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${resumen.totalVentas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(resumen.totalVentas)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <Modal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} title="Vista previa del reporte general" size="xl">
          {pdfUrl && (
            <iframe src={pdfUrl} title="Vista previa PDF" style={{ width: '100%', height: '70vh', border: 'none' }} />
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => generarPDF(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Exportar PDF</button>
            <button onClick={() => setShowPdfModal(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Cerrar</button>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default ReportesBalance;

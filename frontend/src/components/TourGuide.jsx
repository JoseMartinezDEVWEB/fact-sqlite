import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useNavigate, useLocation } from 'react-router-dom';

const TOUR_STATE_KEY = 'app_guided_tour_state';

// ─── CSS personalizado ──────────────────────────────────────────────────
const TOUR_CUSTOM_STYLES = `
  .driver-popover {
    background: #ffffff !important;
    border-radius: 18px !important;
    box-shadow: 0 32px 90px rgba(0,0,0,0.25), 0 8px 32px rgba(79,70,229,0.15) !important;
    padding: 28px 30px !important;
    border: 1px solid rgba(99,102,241,0.18) !important;
    max-width: 480px !important;
    min-width: 340px !important;
    font-family: inherit !important;
  }
  .driver-popover-title {
    font-size: 19px !important;
    font-weight: 800 !important;
    color: #1e1b4b !important;
    margin-bottom: 12px !important;
    line-height: 1.4 !important;
    letter-spacing: -0.2px !important;
  }
  .driver-popover-description {
    font-size: 15px !important;
    color: #374151 !important;
    line-height: 1.75 !important;
  }
  .driver-popover-description strong {
    color: #4f46e5 !important;
    font-weight: 700 !important;
  }
  .driver-popover-footer {
    margin-top: 22px !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
  }
  .driver-popover-progress-text {
    font-size: 13px !important;
    color: #9ca3af !important;
    flex: 1 !important;
    font-weight: 500 !important;
  }
  .driver-popover-next-btn {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 10px 22px !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    color: white !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 4px 14px rgba(79,70,229,0.4) !important;
    text-shadow: none !important;
  }
  .driver-popover-next-btn:hover {
    transform: translateY(-1px) scale(1.04) !important;
    box-shadow: 0 6px 20px rgba(79,70,229,0.5) !important;
  }
  .driver-popover-next-btn:focus { outline: none !important; }
  .driver-popover-prev-btn {
    border: 2px solid #e0e7ff !important;
    border-radius: 10px !important;
    padding: 9px 18px !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    color: #4f46e5 !important;
    background: #f5f3ff !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    text-shadow: none !important;
  }
  .driver-popover-prev-btn:hover { background: #ede9fe !important; border-color: #c7d2fe !important; }
  .driver-popover-prev-btn:focus { outline: none !important; }
  .driver-popover-close-btn {
    color: #d1d5db !important;
    font-size: 22px !important;
    background: none !important;
    border: none !important;
    transition: color 0.2s !important;
    cursor: pointer !important;
  }
  .driver-popover-close-btn:hover { color: #ef4444 !important; }
`;

// ─── Pasos del tour agrupados por fase ─────────────────────────────────

const OVERVIEW_STEPS = [
  {
    popover: {
      title: '👋 ¡Bienvenido a App Total!',
      description:
        'Esta guía te mostrará paso a paso cómo usar todas las funciones de la aplicación.<br><br>' +
        '<span style="color:#9ca3af;font-size:13px;">💡 Presiona <strong style="color:#4f46e5">ESC</strong> o <strong style="color:#4f46e5">✕</strong> para salir en cualquier momento.</span>',
      align: 'center',
    },
  },
  {
    element: '#app-header',
    popover: {
      title: '🔝 Barra Superior',
      description:
        'Aquí encuentras el <strong>estado de tu licencia</strong> y el botón para cerrar sesión de forma segura.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#app-drawer',
    popover: {
      title: '📋 Menú de Navegación',
      description:
        'Tu panel lateral principal. Desde aquí accedes a <strong>todas las secciones</strong> de la aplicación con un solo clic.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#nav-dashboard',
    popover: {
      title: '📊 Inicio — Dashboard',
      description:
        'Visualiza <strong>estadísticas en tiempo real</strong>: ventas del día, ingresos totales y actividad reciente de tu negocio.',
      side: 'right',
    },
  },
  {
    element: '#main-content',
    popover: {
      title: '🖥️ Área de Trabajo',
      description:
        'Aquí se muestra el contenido de cada sección. Siempre <strong>accesible y centrado</strong> en lo que necesitas hacer.',
      side: 'left',
    },
  },
];

const CATEGORIAS_STEPS = [
  {
    popover: {
      title: '🏷️ Módulo: Categorías',
      description:
        'Las categorías te permiten <strong>organizar tus productos</strong> en grupos lógicos para una gestión más eficiente del inventario.',
      align: 'center',
    },
  },
  {
    element: '#categorias-header',
    popover: {
      title: '📌 Panel de Categorías',
      description:
        'Desde aquí puedes ver todas tus categorías existentes y crear nuevas para organizar tu catálogo de productos.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#btn-nueva-categoria',
    popover: {
      title: '➕ Crear Nueva Categoría',
      description:
        'Haz clic aquí para agregar una nueva categoría. Solo necesitas un <strong>nombre</strong> y una descripción opcional.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '#categorias-tabla',
    popover: {
      title: '📋 Lista de Categorías',
      description:
        'Aquí verás todas tus categorías con su nombre, descripción y fecha de creación. Puedes <strong>editar o eliminar</strong> cualquiera con los botones de acción.',
      side: 'top',
      align: 'start',
    },
  },
];

const PRODUCTOS_STEPS = [
  {
    popover: {
      title: '📦 Módulo: Productos',
      description:
        'El catálogo de productos es el <strong>corazón de tu inventario</strong>. Aquí gestionas todo lo que vendes, con precios, stock, categorías e imágenes.',
      align: 'center',
    },
  },
  {
    element: '#productos-header',
    popover: {
      title: '🗂️ Panel de Productos',
      description:
        'Resumen de tu inventario: total de productos, stock bajo, valor del inventario y acciones rápidas.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#btn-nuevo-producto',
    popover: {
      title: '➕ Agregar Producto',
      description:
        'Crea nuevos productos. Puedes definir: nombre, código de barras, precio de compra, <strong>precio de venta, categoría, stock, imagen</strong> y mucho más.',
      side: 'bottom',
      align: 'end',
    },
  },
];

const FACTURAS_STEPS = [
  {
    popover: {
      title: '📄 Módulo: Facturación',
      description:
        'El módulo de facturación te permite <strong>generar comprobantes de venta</strong>, registrar pagos, emitir notas de crédito y procesar devoluciones o cambios.',
      align: 'center',
    },
  },
  {
    element: '#facturas-header',
    popover: {
      title: '🧾 Listado de Facturas',
      description:
        'Aquí puedes ver todas las facturas con filtros por fecha, cliente, método de pago y estado. Haz clic en cualquier factura para ver su detalle completo.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#btn-nueva-factura',
    popover: {
      title: '➕ Crear Nueva Factura',
      description:
        'Inicia el proceso de venta: selecciona el cliente, agrega productos al carrito, elige el método de pago y genera el comprobante con un clic.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    popover: {
      title: '🔄 Devoluciones y Cambios',
      description:
        'Desde el <strong>detalle de cualquier factura</strong> puedes procesar devoluciones o cambios de productos.<br><br>' +
        'El botón naranja <strong>"Devolución / Cambio"</strong> te permite seleccionar los productos, indicar la cantidad, el motivo y elegir si el reembolso es en <strong>efectivo, crédito en cuenta o reemplazo</strong>.',
      align: 'center',
    },
  },
];

const CLIENTES_STEPS = [
  {
    popover: {
      title: '👥 Módulo: Clientes y Usuarios',
      description:
        'Administra tu <strong>base de clientes</strong> para facturación personalizada, y gestiona los <strong>usuarios del sistema</strong> con distintos niveles de acceso.',
      align: 'center',
    },
  },
  {
    element: '#clientes-tabs',
    popover: {
      title: '🔀 Pestañas de Gestión',
      description:
        'Alterna entre el formulario para crear <strong>clientes</strong> (personas o empresas a las que facturas) y <strong>usuarios</strong> del sistema con sus permisos.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#btn-crear-cliente',
    popover: {
      title: '🧑 Registrar Cliente',
      description:
        'Agrega clientes con su nombre, cédula/RUC, teléfono, email y dirección. Estos datos se usarán automáticamente al crear facturas.',
      side: 'bottom',
      align: 'start',
    },
  },
];

const PROVEEDORES_STEPS = [
  {
    popover: {
      title: '🏭 Módulo: Proveedores',
      description:
        'Gestiona tus <strong>proveedores y compras a crédito</strong>. Lleva el control de deudas pendientes, historial de transacciones y datos de contacto.',
      align: 'center',
    },
  },
  {
    element: '#btn-nuevo-proveedor',
    popover: {
      title: '➕ Registrar Proveedor',
      description:
        'Agrega un nuevo proveedor con su nombre, RUC, datos de contacto y notas. Podrás registrar <strong>pagos y deudas</strong> directamente desde su perfil.',
      side: 'bottom',
      align: 'end',
    },
  },
];

const DEVOLUCION_STEPS = [
  {
    popover: {
      title: '🔄 Función: Devolución y Cambio',
      description:
        'Cuando un cliente devuelve un producto o quiere cambiarlo por otro, puedes gestionarlo directamente desde el detalle de la factura original.',
      align: 'center',
    },
  },
  {
    element: '#btn-devolucion',
    popover: {
      title: '↩️ Botón de Devolución / Cambio',
      description:
        'Haz clic aquí para abrir el módulo de devolución. Podrás seleccionar los productos a devolver, indicar la cantidad, el motivo y elegir si el reembolso es en <strong>efectivo, crédito en cuenta o reemplazo</strong>.',
      side: 'bottom',
      align: 'end',
    },
  },
];

const FINISH_STEP = {
  element: '#tour-guide-btn',
  popover: {
    title: '🎓 ¡Tour completado!',
    description:
      'Ya conoces todas las secciones principales. Haz clic en este botón en <strong>cualquier momento</strong> para volver a ver la guía o explorar una sección específica. ¡Mucho éxito! 🚀',
    side: 'top',
    align: 'end',
  },
};

// ─── Mapa de fases del tour ─────────────────────────────────────────────
const PHASE_MAP = {
  overview:     { path: '/dashboard',              steps: OVERVIEW_STEPS },
  categorias:   { path: '/dashboard/categorias',   steps: CATEGORIAS_STEPS },
  productos:    { path: '/dashboard/productos',     steps: PRODUCTOS_STEPS },
  facturas:     { path: '/dashboard/facturas',      steps: FACTURAS_STEPS },
  clientes:     { path: '/dashboard/clientes',      steps: CLIENTES_STEPS },
  proveedores:  { path: '/dashboard/proveedores',   steps: PROVEEDORES_STEPS },
};

const PHASE_ORDER = ['overview', 'categorias', 'productos', 'facturas', 'clientes', 'proveedores'];

// ─── Componente principal ───────────────────────────────────────────────
const TourGuide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTooltip, setShowTooltip] = useState(false);
  const driverRef = useRef(null);

  // Inyectar CSS personalizado
  useEffect(() => {
    if (!document.getElementById('tour-guide-custom-styles')) {
      const el = document.createElement('style');
      el.id = 'tour-guide-custom-styles';
      el.textContent = TOUR_CUSTOM_STYLES;
      document.head.appendChild(el);
    }
    return () => {
      document.getElementById('tour-guide-custom-styles')?.remove();
    };
  }, []);

  // Auto-reanudar tour al navegar a una nueva página
  useEffect(() => {
    const savedRaw = localStorage.getItem(TOUR_STATE_KEY);
    if (!savedRaw) return;
    const { phase } = JSON.parse(savedRaw);
    if (!phase || phase === 'done') return;

    const expected = PHASE_MAP[phase]?.path;
    const onCorrectPage =
      expected && (location.pathname === expected || location.pathname.startsWith(expected + '/'));

    if (!onCorrectPage) return;

    const timer = setTimeout(() => launchPhase(phase), 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const saveTourState = (phase) =>
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify({ phase }));

  const clearTourState = () => localStorage.removeItem(TOUR_STATE_KEY);

  const destroyDriver = () => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  };

  const navigateToNextPhase = (currentPhase) => {
    const idx = PHASE_ORDER.indexOf(currentPhase);
    const nextPhase = PHASE_ORDER[idx + 1];

    destroyDriver();

    if (nextPhase) {
      saveTourState(nextPhase);
      navigate(PHASE_MAP[nextPhase].path);
      return;
    }

    // Última fase: mostrar paso final
    clearTourState();
    if (location.pathname === '/dashboard') {
      launchFinish();
    } else {
      saveTourState('finish');
      navigate('/dashboard');
    }
  };

  const launchFinish = () => {
    clearTourState();
    const d = buildDriver([FINISH_STEP], 'finish');
    driverRef.current = d;
    d.drive();
  };

  // Manejar el paso "finish" guardado
  useEffect(() => {
    const savedRaw = localStorage.getItem(TOUR_STATE_KEY);
    if (!savedRaw) return;
    const { phase } = JSON.parse(savedRaw);
    if (phase !== 'finish') return;
    if (location.pathname !== '/dashboard') return;
    clearTourState();
    const timer = setTimeout(() => launchFinish(), 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const buildDriver = (steps, phase) => {
    return driver({
      showProgress: true,
      progressText: 'Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: phase === PHASE_ORDER.at(-1)
        ? '¡Ver resumen final!'
        : '✓ ¡Listo!',
      stagePadding: 12,
      stageRadius: 12,
      allowClose: true,
      overlayOpacity: 0.6,
      steps,
      onDestroyStarted: () => {
        clearTourState();
        destroyDriver();
      },
      onNextClick: (_el, _step, { config }) => {
        const d = driverRef.current;
        if (!d) return;
        if (d.isLastStep()) {
          // Navegar a la siguiente fase
          navigateToNextPhase(phase);
        } else {
          d.moveNext();
        }
      },
    });
  };

  const launchPhase = (phase) => {
    destroyDriver();

    const phaseInfo = PHASE_MAP[phase];
    if (!phaseInfo) return;

    // Agregar paso de transición al final de cada fase (excepto la última)
    const phaseIdx = PHASE_ORDER.indexOf(phase);
    const nextPhase = PHASE_ORDER[phaseIdx + 1];

    const transitionStep = nextPhase ? {
      popover: {
        title: `✅ Sección completada`,
        description: `Has terminado la guía de <strong>${phaseInfo.path.split('/').pop()}</strong>.<br><br>
          A continuación veremos: <strong style="color:#4f46e5">${PHASE_MAP[nextPhase]?.path.split('/').pop()}</strong>.`,
        align: 'center',
      },
    } : null;

    const allSteps = transitionStep
      ? [...phaseInfo.steps, transitionStep]
      : phaseInfo.steps;

    const d = buildDriver(allSteps, phase);
    driverRef.current = d;
    d.drive();
  };

  // ── Botón de inicio ──────────────────────────────────────────────────
  const handleClick = () => {
    setShowTooltip(false);
    clearTourState();
    destroyDriver();

    // Detectar en qué página estamos para mostrar tour contextual o completo
    const currentPhase = PHASE_ORDER.find(p =>
      location.pathname === PHASE_MAP[p].path ||
      location.pathname.startsWith(PHASE_MAP[p].path + '/')
    );

    if (currentPhase) {
      launchPhase(currentPhase);
    } else {
      // Ruta desconocida → ir al dashboard
      saveTourState('overview');
      navigate('/dashboard');
    }
  };

  return (
    <div id="tour-guide-btn" className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bottom-[72px] right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 px-4 py-3 pointer-events-none"
            style={{ minWidth: '185px' }}
          >
            <p className="font-bold text-sm text-indigo-700">Guía Interactiva</p>
            <p className="text-xs text-gray-400 mt-0.5">Clic para iniciar el recorrido</p>
            <div className="absolute -bottom-[7px] right-5 w-3.5 h-3.5 bg-white border-r border-b border-gray-100 rotate-45 rounded-br-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative flex items-center justify-center w-14 h-14 rounded-full text-white"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          boxShadow: '0 8px 32px rgba(79,70,229,0.45)',
        }}
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.8 }}
        whileHover={{ scale: 1.12, rotate: 8, boxShadow: '0 12px 40px rgba(79,70,229,0.55)' }}
        whileTap={{ scale: 0.9 }}
        aria-label="Iniciar guía interactiva"
        title="Guía interactiva"
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: 'rgba(99,102,241,0.4)' }}
          animate={{ scale: [1, 1.65, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: 'rgba(124,58,237,0.35)' }}
          animate={{ scale: [1, 1.95, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.65 }}
        />
        <GraduationCap className="w-7 h-7 relative z-10 drop-shadow-sm" />
      </motion.button>
    </div>
  );
};

export default TourGuide;

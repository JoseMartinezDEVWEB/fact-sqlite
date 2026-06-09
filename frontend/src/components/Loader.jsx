import { useLoading } from '../context/LoadingContext';
import { useEffect, useRef } from 'react';

let useLocationSafe = null;
try {
  useLocationSafe = require('react-router-dom').useLocation;
} catch {}

const Loader = () => {
  const { isLoading, loadingMessage, hideLoader } = useLoading();
  const overlayRef = useRef(null);

  let isHomePage = false;
  if (useLocationSafe) {
    try {
      const location = useLocationSafe();
      isHomePage = location.pathname === '/';
    } catch {
      isHomePage = false;
    }
  }

  useEffect(() => {
    if (isHomePage && isLoading) hideLoader();
  }, [isHomePage, isLoading, hideLoader]);

  // El overlay siempre está en el DOM pero cambia opacidad con transición CSS
  // Esto elimina el parpadeo brusco que ocurría con mount/unmount instantáneo
  const visible = isLoading && !isHomePage;

  return (
    <div
      ref={overlayRef}
      aria-hidden={!visible}
      style={{
        pointerEvents: visible ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 z-50"
    >
      <style>{`
        @keyframes smoothSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          0%   { width: 0%; }
          50%  { width: 100%; }
          100% { width: 0%; }
        }
        .loader-spinner { animation: smoothSpin 1.2s linear infinite; }
        .loader-bar     { animation: slideIn  1.4s ease-in-out infinite; }
      `}</style>

      <div
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.92)',
          transition: 'transform 0.2s ease',
        }}
        className="flex flex-col items-center bg-white px-10 py-8 rounded-xl shadow-2xl"
      >
        <div className="mb-5">
          <svg className="loader-spinner w-12 h-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <circle cx="12" cy="4"  r="2"  fill="currentColor" opacity="0.85" />
          </svg>
        </div>
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div className="loader-bar h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" />
        </div>
        <p className="text-base font-semibold text-gray-700 text-center">
          {loadingMessage || 'Cargando...'}
        </p>
      </div>
    </div>
  );
};

export default Loader; 
import { createContext, useState, useContext, useRef, useCallback } from 'react';

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Cargando...');
  // Referencia única al timer activo — evita timers competitivos que causan parpadeo
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Muestra el loader y lo oculta automáticamente después de maxTime
  const showLoader = useCallback((maxTime = 2000, message = 'Cargando...') => {
    clearTimer();
    setLoadingMessage(message);
    setIsLoading(true);

    return new Promise((resolve) => {
      timerRef.current = setTimeout(() => {
        setIsLoading(false);
        timerRef.current = null;
        resolve();
      }, Math.min(maxTime, 5000));
    });
  }, []);

  // Oculta el loader inmediatamente (cancela el timer automático)
  const hideLoader = useCallback(() => {
    clearTimer();
    setIsLoading(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, showLoader, hideLoader }}>
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingContext; 
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { validateLicense, storeLicenseData, getLicenseData } from '../services/licenseService';
import { useAuth } from './AuthContext';
import { useLoading } from './LoadingContext';
import { ROLES } from '../utils/constants';

// Create context
const LicenseContext = createContext();

// Provider component
export const LicenseProvider = ({ children }) => {
  const [licenseStatus, setLicenseStatus] = useState('checking');
  const [licenseData, setLicenseData] = useState(null);
  const [isValid, setIsValid] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [error, setError] = useState(null);
  const [licenseType, setLicenseType] = useState(null);
  const [countdownDisplay, setCountdownDisplay] = useState('');
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningModalInfo, setWarningModalInfo] = useState({ title: '', message: '' });
  const [showBlockingModal, setShowBlockingModal] = useState(false); // Added for blocking modal
  const [blockingModalInfo, setBlockingModalInfo] = useState({ title: '', message: '' }); // Added for blocking modal
  const { isAuthenticated, user } = useAuth(); 
  const { showLoader, hideLoader } = useLoading();

  // Validate license
  const validateUserLicense = useCallback(async (userId, silent = false) => { // Added userId parameter
    console.log('[LicenseContext] validateUserLicense: Start. UserID:', userId, 'Authenticated:', isAuthenticated, 'Silent:', silent);
    if (!isAuthenticated || !userId) { // Check userId directly
      console.log('[LicenseContext] User not authenticated or no UserID provided, setting status to not_authenticated.');
      setLicenseStatus('not_authenticated');
      if (!silent) hideLoader(); // Ensure loader is hidden if validation aborts
      return;
    }

    try {
      // Check if we have cached license data for the specific user
      const cachedData = getLicenseData(userId); // Use userId
      if (cachedData && cachedData.isValid !== undefined) {
        setLicenseData(cachedData);
        setIsValid(cachedData.isValid);
        setLicenseStatus(cachedData.status);
        setDaysRemaining(cachedData.daysRemaining);
        
        // If cached data is less than 1 hour old, don't re-validate
        if (Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
          return;
        }
      }
      
      // Validate with server
      console.log('[LicenseContext] Attempting to validate with server for user:', userId);
      const data = await validateLicense(userId); // Use userId
      console.log('[LicenseContext] Received data from server:', data);
      if (!silent) hideLoader();
      console.log('[LicenseContext] Raw license data received from server for user', userId, ':', data);

      // Store data using the service function, which handles timestamping
      storeLicenseData(data, userId);

      setLicenseData(data); // data from backend should include all necessary fields
      setIsValid(data.isValid);
      setLicenseStatus(data.status);
      setDaysRemaining(data.daysRemaining);
      setLicenseType(data.licenseType); // Ensure data from backend includes licenseType
      // The redundant storeLicenseData(data) was here; it's removed. storeLicenseData(data, userId) on line 52 is correct.
    } catch (error) {
      console.error('[LicenseContext] CRITICAL ERROR validating license:', error);
      console.error('Error validating license:', error);
      setError(error.message || 'Error validating license');
      setIsValid(false);
      setLicenseStatus('error');
      console.log('[LicenseContext] Set licenseStatus to error.');
    }
  }, [isAuthenticated, user, showLoader, hideLoader]);

  // Initial validation
  useEffect(() => {
    console.log('[LicenseContext] Initial validation useEffect triggered. isAuthenticated:', isAuthenticated, 'user:', user);
    if (isAuthenticated && user?._id && user?.role) {
      if (user.role === ROLES.SUPERADMIN) {
        console.log('[LicenseContext] User is SUPERADMIN. Setting license as perpetually valid.');
        setLicenseData({ isValid: true, status: 'SUPERADMIN_ACTIVE', message: 'Acceso completo como Super Administrador.' });
        setIsValid(true);
        setLicenseStatus('SUPERADMIN_ACTIVE'); 
        setDaysRemaining(Infinity); 
        setLicenseType('SUPERADMIN');
        hideLoader(); 
      } else {
        console.log('[LicenseContext] Conditions met for standard user, calling validateUserLicense().');
        validateUserLicense(user._id);
      }
    } else {
      console.log('[LicenseContext] Conditions NOT met for initial license validation (isAuthenticated, user._id, or user.role missing).');
      setLicenseData(null);
      setIsValid(false);
      setLicenseStatus('SIN_VERIFICAR');
      setDaysRemaining(null);
      setLicenseType(null); // Added back
    }
  }, [isAuthenticated, user, validateUserLicense]); // End of initial validation useEffect

  // Set up hourly validation
  useEffect(() => {
    console.log('[LicenseContext] Hourly validation setup. isAuthenticated:', isAuthenticated, 'User role:', user?.role);
    if (!isAuthenticated || !user?._id || user.role === ROLES.SUPERADMIN) {
      // Don't run hourly check if not authenticated, no user ID, or if superadmin
      return;
    }

    const interval = setInterval(() => {
      console.log('[LicenseContext] Performing hourly license check for user:', user._id);
      validateUserLicense(user._id, true); // Pass userId and silent flag
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      console.log('[LicenseContext] Clearing hourly validation interval for user:', user?._id);
      clearInterval(interval);
    };
  }, [isAuthenticated, user, validateUserLicense]); // Dependencies for hourly validation useEffect

  // Helper function to format countdown
  const formatCountdown = (milliseconds) => {
    if (milliseconds <= 0) {
      return '0d 0h 0m 0s';
    }
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    seconds %= 60;
    minutes %= 60;
    hours %= 24;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // useEffect for Countdown Timer
  useEffect(() => {
    if (!isValid || !licenseData?.expiryDate || licenseStatus === ROLES.SUPERADMIN || user?.role === ROLES.SUPERADMIN) {
      if (user?.role === ROLES.SUPERADMIN) {
        setCountdownDisplay('Acceso Superadmin');
      } else if (licenseStatus === 'expired' || licenseStatus === 'blocked') {
        setCountdownDisplay('Licencia Expirada/Bloqueada');
      } else {
        setCountdownDisplay('');
      }
      return;
    }

    const expiryTime = new Date(licenseData.expiryDate).getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const remaining = expiryTime - now;

      if (remaining <= 0) {
        setCountdownDisplay('Licencia Expirada');
        // Optionally, trigger a re-validation if the countdown reaches zero
        if (user?._id && licenseStatus !== 'expired') {
          validateUserLicense(user._id, true);
        }
        return null; // Stop interval by returning null
      } else {
        setCountdownDisplay(formatCountdown(remaining));
        return remaining; // Continue interval
      }
    };

    // Initial call to set countdown immediately
    const initialRemaining = updateCountdown();
    if (initialRemaining === null) return; // Stop if already expired

    const intervalId = setInterval(() => {
      if (updateCountdown() === null) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [licenseData, isValid, licenseStatus, user, validateUserLicense]);

  // useEffect for Blocking Modal (when license is expired or blocked)
  useEffect(() => {
    if (isAuthenticated && user?.role !== ROLES.SUPERADMIN) {
      if (licenseStatus === 'expired' || licenseStatus === 'blocked') {
        setBlockingModalInfo({
          title: 'Acceso Restringido',
          message: 'Su licencia ha expirado o ha sido bloqueada. Por favor, contacte al administrador para renovarla y restaurar el acceso.'
        });
        setShowBlockingModal(true);
      } else {
        setShowBlockingModal(false);
      }
    } else {
      // If not authenticated, or is superadmin, or license is valid, don't show blocking modal
      setShowBlockingModal(false);
    }
  }, [licenseStatus, isAuthenticated, user]);

  // useEffect for Warning Modals
  const closeLicenseWarningModal = () => setIsWarningModalOpen(false);

  useEffect(() => {
    if (isWarningModalOpen) return; // Don't re-evaluate if modal is already open
    if (!isAuthenticated || !user?._id || user.role === ROLES.SUPERADMIN) return;
    if (licenseStatus !== 'active' && licenseStatus !== 'trial') return;

    const checkAndSetWarning = (daysThreshold, messageKey) => {
      const warningStorageKey = `warned_${messageKey}_session_user_${user._id}`;
      if (sessionStorage.getItem(warningStorageKey)) {
        return; // Already warned this session for this threshold
      }

      setWarningModalInfo({
        title: 'Advertencia de Licencia',
        message: `Su licencia expirará en ${daysThreshold} día${daysThreshold > 1 ? 's' : ''}. Por favor, contacte a soporte para renovarla.`
      });
      setIsWarningModalOpen(true);
      sessionStorage.setItem(warningStorageKey, 'true');
    };

    if (daysRemaining === 2) {
      checkAndSetWarning(2, '2_days');
    } else if (daysRemaining === 1) {
      checkAndSetWarning(1, '1_day');
    }
  }, [daysRemaining, licenseStatus, isAuthenticated, user, isWarningModalOpen]);

  // Format days remaining message
  const getLicenseMessage = useCallback(() => {
    if (!isAuthenticated) return 'No autenticado';
    if (licenseStatus === 'checking') return 'Verificando licencia...';
    if (licenseStatus === 'error') return 'Error al verificar licencia';
    if (!isValid) return 'Licencia inválida';
    
    if (licenseStatus === 'trial') {
      return `Período de prueba: ${daysRemaining} días restantes`;
    } else if (licenseStatus === 'active') {
      return `Licencia activa: ${daysRemaining} días restantes`;
    } else if (licenseStatus === 'expired') {
      return 'Licencia expirada - En período de gracia';
    } else {
      return 'Licencia bloqueada';
    }
  }, [isAuthenticated, licenseStatus, isValid, daysRemaining]);

  // Context value
  const contextValue = {
    licenseStatus,
    licenseData,
    isValid,
    daysRemaining,
    error,
    validateLicense: validateUserLicense,
    getLicenseMessage,
    countdownDisplay, // Added
    isWarningModalOpen, // Added
    warningModalInfo,   // Added
    closeLicenseWarningModal, // Added
    showBlockingModal, // Added
    blockingModalInfo, // Added
  };

  return (
    <LicenseContext.Provider value={contextValue}>
      {children}
    </LicenseContext.Provider>
  );
};

// Hook to use the license context
export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense debe usarse dentro de un LicenseProvider');
  }
  return context;
};

export default LicenseContext;

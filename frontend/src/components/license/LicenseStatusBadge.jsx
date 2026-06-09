import React from 'react';
import { useLicense } from '../../context/LicenseContext';

const LicenseStatusBadge = () => {
  const { licenseStatus, daysRemaining, isValid } = useLicense();

  // Get badge color based on license status and days remaining
  const getBadgeColor = () => {
    if (!isValid) return 'bg-red-100 text-red-800 border-red-200';
    
    if (licenseStatus === 'trial') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (licenseStatus === 'active') {
      if (daysRemaining <= 5) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      }
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (licenseStatus === 'expired') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get badge text
  const getBadgeText = () => {
    if (licenseStatus === 'checking') return 'Verificando...';
    if (!isValid) return 'Licencia Inválida';
    
    if (licenseStatus === 'trial') {
      return `Prueba: ${daysRemaining} días`;
    } else if (licenseStatus === 'active') {
      return `Licencia: ${daysRemaining} días`;
    } else if (licenseStatus === 'expired') {
      return 'En período de gracia';
    } else if (licenseStatus === 'blocked') {
      return 'Bloqueada';
    } else {
      return 'Desconocido';
    }
  };

  return (
    <div className={`px-3 py-1 text-xs font-medium rounded-full border ${getBadgeColor()}`}>
      {getBadgeText()}
    </div>
  );
};

export default LicenseStatusBadge;

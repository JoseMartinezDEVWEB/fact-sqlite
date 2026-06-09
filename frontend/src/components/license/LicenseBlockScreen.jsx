import React from 'react';
import { useLicense } from '../../context/LicenseContext';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';

const LicenseBlockScreen = () => {
  const { licenseData, licenseStatus } = useLicense();
  const { user } = useAuth();

  // Format expiry date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return moment(date).format('DD/MM/YYYY HH:mm');
  };

  // Get appropriate message based on license status
  const getMessage = () => {
    if (licenseStatus === 'expired') {
      return {
        title: 'Licencia Expirada - Período de Gracia',
        message: 'Su licencia ha expirado, pero se encuentra en período de gracia. Por favor, renueve su licencia para continuar utilizando el sistema.',
        info: `Su acceso será bloqueado el ${formatDate(licenseData?.gracePeriodEnd)} (7:00 PM).`,
        icon: '⚠️'
      };
    } else if (licenseStatus === 'blocked') {
      return {
        title: 'Licencia Bloqueada',
        message: 'Su licencia ha sido bloqueada. Por favor, contacte al administrador para renovar su licencia.',
        info: 'No podrá acceder al sistema hasta que su licencia sea renovada.',
        icon: '🔒'
      };
    } else {
      return {
        title: 'Error de Licencia',
        message: 'Ha ocurrido un error con su licencia. Por favor, contacte al administrador.',
        info: 'No se pudo validar el estado de su licencia.',
        icon: '❌'
      };
    }
  };

  const messageData = getMessage();

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{messageData.icon}</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">{messageData.title}</h2>
          <p className="text-gray-700 mb-4">{messageData.message}</p>
          <p className="text-sm text-gray-500 italic">{messageData.info}</p>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="font-semibold text-gray-700 mb-2">Información de Usuario</h3>
          <p className="text-sm text-gray-600">Usuario: {user?.username || 'N/A'}</p>
          <p className="text-sm text-gray-600">Email: {user?.email || 'N/A'}</p>
          {licenseData?.expiryDate && (
            <p className="text-sm text-gray-600">
              Fecha de Expiración: {formatDate(licenseData.expiryDate)}
            </p>
          )}
        </div>

        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Contacto para Renovación</h3>
          <p className="text-sm text-gray-600">
            Por favor contacte al administrador del sistema para renovar su licencia:
          </p>
          <p className="text-sm font-medium mt-2">
            <span className="text-gray-600">Email: </span>
            <a href="mailto:admin@sistema-facturacion.com" className="text-blue-600 hover:underline">
              admin@sistema-facturacion.com
            </a>
          </p>
          <p className="text-sm font-medium">
            <span className="text-gray-600">Teléfono: </span>
            <a href="tel:+1234567890" className="text-blue-600 hover:underline">
              +123 456 7890
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseBlockScreen;

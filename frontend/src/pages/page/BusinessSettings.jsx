import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { saveBusinessInfo, getBusinessInfo } from '../../services/businessService';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axiosConfig';

const BusinessSettings = () => {
  const navigate = useNavigate();
  const { updateBusinessInfo } = useBusiness();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const isSuperAdmin = user && user.role === 'superadmin';
  
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    comments: '',
    logo: null
  });
  
  // Estado para la configuración de licencias
  const [licenseConfig, setLicenseConfig] = useState({
    trialDuration: 5,
    basicDuration: 30,
    premiumDuration: 90,
    enterpriseDuration: 365,
    gracePeriod: 2,
    reminderDays: [7, 3, 1],
    autoBlockExpired: true
  });
  
  // Estado para controlar la edición de configuración de licencias
  const [editingLicenseConfig, setEditingLicenseConfig] = useState(false);
  const [savingLicenseConfig, setSavingLicenseConfig] = useState(false);

  // ── Estado configuración DGII / NCF ────────────────────────────────
  const [ncfConfig, setNcfConfig] = useState({
    enabled:           false,
    defaultType:       'B02',
    currentSequence:   1,
    usesECF:           false,
    ecfProvider:       'alanube',
    ecfApiKey:         '',
    ecfApiUrl:         '',
    rnc:               '',
  });
  const [savingNcf, setSavingNcf] = useState(false);

  // Cargar datos existentes si los hay
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        setLoading(true);
        const response = await getBusinessInfo();
        
        if (response.success && response.data) {
          const data = response.data;
          setFormData({
            name: data.name || '',
            taxId: data.rnc || data.taxId || '',   // BD guarda como rnc
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            comments: data.comments || '',
            logo: data.logoUrl || data.logo || null
          });

          if (data.logoUrl || data.logo) {
            setLogoPreview(data.logoUrl || data.logo);
          }
        }
        
        // Cargar configuración NCF/DGII desde localStorage
        try {
          const savedNcf = localStorage.getItem('dgii_ncf_config');
          if (savedNcf) setNcfConfig(JSON.parse(savedNcf));
        } catch (_) { /* usa valores por defecto */ }

        // Cargar configuración de licencias si el usuario es superadmin
        if (isSuperAdmin) {
          try {
            const licenseConfigResponse = await api.get('/licenses/config');
            if (licenseConfigResponse.data.success) {
              setLicenseConfig(licenseConfigResponse.data.data);
            }
          } catch (licenseError) {
            console.error('Error al cargar configuración de licencias:', licenseError);
            // No mostrar error al usuario, usar valores predeterminados
          }
        }
      } catch (error) {
        console.error('Error al cargar datos existentes:', error);
        toast.error('No se pudieron cargar los datos existentes');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExistingData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Manejar cambios en la configuración de licencias
  const handleLicenseConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLicenseConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) : value)
    }));
  };
  
  // Guardar configuración de licencias
  const saveLicenseConfig = async () => {
    try {
      setSavingLicenseConfig(true);
      const response = await api.post('/licenses/config', licenseConfig);
      
      if (response.data.success) {
        toast.success('Configuración de licencias actualizada correctamente');
        setEditingLicenseConfig(false);
      } else {
        toast.error(response.data.message || 'Error al guardar la configuración de licencias');
      }
    } catch (error) {
      console.error('Error al guardar configuración de licencias:', error);
      toast.error('Error al guardar la configuración de licencias');
    } finally {
      setSavingLicenseConfig(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validar tipo y tamaño
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(file.type)) {
        toast.error('Solo se permiten imágenes (jpeg, jpg, png, gif)');
        return;
      }
      
      if (file.size > maxSize) {
        toast.error('El archivo no debe superar los 5MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        logo: file
      }));
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica — solo nombre, dirección y teléfono son obligatorios
    if (!formData.name || !formData.address || !formData.phone) {
      toast.error('Nombre, dirección y teléfono son campos obligatorios');
      return;
    }
    
    try {
      setLoading(true);
      const response = await saveBusinessInfo(formData);
      
      if (response.success) {
        toast.success('Información del negocio guardada con éxito');
        // Actualizar el contexto global
        updateBusinessInfo(response.data);
        navigate('/dashboard');
      } else {
        toast.error(response.message || 'Error al guardar la información');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error(error.message || 'Ocurrió un error al guardar los datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container mx-auto p-4"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Configuración del Negocio</h1>
        
        {/* Sección de Licencias para SuperAdmin */}
        {isSuperAdmin && (
          <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold text-blue-800 mb-2 flex items-center">
              <span className="mr-2">🔑</span>
              Control de Licencias y Suscripciones
            </h2>
            <p className="text-blue-700 mb-4">
              Como SuperAdmin, puedes gestionar las licencias de todos los usuarios del sistema.
              Activa nuevas licencias, renueva existentes o revisa el historial de cada usuario.
            </p>
            <div className="flex space-x-4">
              <Link 
                to="/dashboard/licencias" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
              >
                <span className="mr-2">⚙️</span>
                Gestionar Licencias
              </Link>
              <button
                onClick={() => setEditingLicenseConfig(!editingLicenseConfig)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
              >
                <span className="mr-2">⏰</span>
                {editingLicenseConfig ? 'Cancelar Edición' : 'Configurar Tiempos de Licencia'}
              </button>
            </div>
            
            {/* Formulario de configuración de licencias */}
            {editingLicenseConfig && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Configuración de Tiempos de Licencia</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Duración de licencias */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Duración de Licencias (días)</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Licencia de Prueba</label>
                        <input
                          type="number"
                          name="trialDuration"
                          value={licenseConfig.trialDuration}
                          onChange={handleLicenseConfigChange}
                          min="1"
                          max="30"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Licencia Básica</label>
                        <input
                          type="number"
                          name="basicDuration"
                          value={licenseConfig.basicDuration}
                          onChange={handleLicenseConfigChange}
                          min="1"
                          max="90"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Licencia Premium</label>
                        <input
                          type="number"
                          name="premiumDuration"
                          value={licenseConfig.premiumDuration}
                          onChange={handleLicenseConfigChange}
                          min="1"
                          max="180"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Licencia Empresarial</label>
                        <input
                          type="number"
                          name="enterpriseDuration"
                          value={licenseConfig.enterpriseDuration}
                          onChange={handleLicenseConfigChange}
                          min="1"
                          max="730"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Configuraciones adicionales */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Configuraciones Adicionales</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Período de Gracia (días)</label>
                        <input
                          type="number"
                          name="gracePeriod"
                          value={licenseConfig.gracePeriod}
                          onChange={handleLicenseConfigChange}
                          min="0"
                          max="30"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Días adicionales después del vencimiento antes de bloquear el acceso</p>
                      </div>
                      
                      <div className="mt-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            name="autoBlockExpired"
                            checked={licenseConfig.autoBlockExpired}
                            onChange={handleLicenseConfigChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Bloquear automáticamente licencias vencidas</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-700 mb-2">Recordatorios de Renovación</h4>
                      <p className="text-xs text-gray-500 mb-2">Días antes del vencimiento para enviar recordatorios</p>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          name="reminderDays[0]"
                          value={licenseConfig.reminderDays[0]}
                          onChange={(e) => {
                            const newDays = [...licenseConfig.reminderDays];
                            newDays[0] = parseInt(e.target.value);
                            setLicenseConfig({...licenseConfig, reminderDays: newDays});
                          }}
                          min="1"
                          max="30"
                          className="w-16 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="number"
                          name="reminderDays[1]"
                          value={licenseConfig.reminderDays[1]}
                          onChange={(e) => {
                            const newDays = [...licenseConfig.reminderDays];
                            newDays[1] = parseInt(e.target.value);
                            setLicenseConfig({...licenseConfig, reminderDays: newDays});
                          }}
                          min="1"
                          max="30"
                          className="w-16 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="number"
                          name="reminderDays[2]"
                          value={licenseConfig.reminderDays[2]}
                          onChange={(e) => {
                            const newDays = [...licenseConfig.reminderDays];
                            newDays[2] = parseInt(e.target.value);
                            setLicenseConfig({...licenseConfig, reminderDays: newDays});
                          }}
                          min="1"
                          max="30"
                          className="w-16 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-sm text-gray-500">días antes</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingLicenseConfig(false)}
                    className="mr-3 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveLicenseConfig}
                    disabled={savingLicenseConfig}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                  >
                    {savingLicenseConfig ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </>
                    ) : 'Guardar Configuración'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-40 h-40 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center mb-2 border-2 border-gray-200">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400">Sin logo</span>
              )}
            </div>
            <label className="relative cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors">
              <span>Seleccionar Logo</span>
              <input
                type="file"
                onChange={handleLogoChange}
                accept="image/jpeg,image/jpg,image/png,image/gif"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
            <p className="text-sm text-gray-500 mt-1">Formatos: JPG, PNG, GIF (máx. 5MB)</p>
          </div>
          
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RNC/Identificación Fiscal</label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="2"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://www.ejemplo.com"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios Adicionales</label>
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows="3"
                placeholder="Notas o información adicional sobre el negocio..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
          </div>
          
          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : 'Guardar Configuración'}
            </button>
          </div>
        </form>
        
        {/* ── Sección DGII / Comprobantes Fiscales (solo superadmin) ── */}
        {isSuperAdmin && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🇩🇴</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Comprobantes Fiscales DGII (NCF / e-CF)</h2>
                <p className="text-sm text-gray-500">República Dominicana — Dirección General de Impuestos Internos</p>
              </div>
            </div>

            {/* Aviso informativo */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
              <p className="font-semibold mb-1">📋 ¿Qué necesitas para usar NCF / e-CF?</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                <li>Registro como contribuyente con RNC activo en la DGII</li>
                <li>Solicitar autorización de secuencias de NCF en la <a href="https://dgii.gov.do" target="_blank" rel="noreferrer" className="underline">Oficina Virtual DGII</a></li>
                <li>Para e-CF (electrónico): obtener certificado digital y registrarse como emisor electrónico</li>
                <li>Opcionalmente, contratar un proveedor certificado (Alanube, ef2, ECF-SSD) que simplifica la integración</li>
              </ol>
            </div>

            {/* Toggle habilitar NCF */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4">
              <div>
                <p className="font-semibold text-gray-800">Habilitar Comprobantes Fiscales (NCF)</p>
                <p className="text-sm text-gray-500">Las facturas mostrarán el número NCF y el formato cambiará al estándar DGII</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ncfConfig.enabled}
                  onChange={e => setNcfConfig(p => ({ ...p, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>

            {ncfConfig.enabled && (
              <div className="space-y-4">
                {/* RNC del negocio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RNC del Negocio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ncfConfig.rnc}
                    onChange={e => setNcfConfig(p => ({ ...p, rnc: e.target.value }))}
                    placeholder="Ej: 130266831"
                    maxLength={11}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-400 focus:border-green-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">RNC de 9 u 11 dígitos registrado en la DGII</p>
                </div>

                {/* Tipo de NCF por defecto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Comprobante por Defecto</label>
                  <select
                    value={ncfConfig.defaultType}
                    onChange={e => setNcfConfig(p => ({ ...p, defaultType: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-400"
                  >
                    <optgroup label="Comprobantes Tradicionales (papel)">
                      <option value="B02">B02 — Factura de Consumo (consumidor final)</option>
                      <option value="B01">B01 — Factura de Crédito Fiscal (contribuyentes)</option>
                      <option value="B04">B04 — Nota de Crédito</option>
                      <option value="B03">B03 — Nota de Débito</option>
                    </optgroup>
                    <optgroup label="Comprobantes Electrónicos (e-CF)">
                      <option value="E32">E32 — Factura Electrónica de Consumo</option>
                      <option value="E31">E31 — Factura Electrónica de Crédito Fiscal</option>
                      <option value="E34">E34 — Nota de Crédito Electrónica</option>
                      <option value="E33">E33 — Nota de Débito Electrónica</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    B02/E32 para ventas al consumidor · B01/E31 para ventas a empresas (requieren RNC del cliente)
                  </p>
                </div>

                {/* Secuencia actual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Secuencia Actual</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min={1}
                      value={ncfConfig.currentSequence}
                      onChange={e => setNcfConfig(p => ({ ...p, currentSequence: Number(e.target.value) || 1 }))}
                      className="w-48 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-400"
                    />
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-md font-mono">
                      Vista previa: <strong>{ncfConfig.defaultType}{String(ncfConfig.currentSequence).padStart(ncfConfig.defaultType.startsWith('E') ? 10 : 8, '0')}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Este número debe coincidir con la secuencia autorizada por la DGII. Se incrementa automáticamente con cada factura emitida.
                  </p>
                </div>

                {/* Toggle e-CF electrónico */}
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Usar e-CF (Comprobante Fiscal Electrónico)</p>
                    <p className="text-xs text-gray-500">Requiere registro como emisor electrónico en la DGII y certificado digital</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ncfConfig.usesECF}
                      onChange={e => setNcfConfig(p => ({ ...p, usesECF: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-yellow-300 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                {ncfConfig.usesECF && (
                  <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm font-semibold text-yellow-800">⚡ Configuración e-CF</p>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor e-CF</label>
                      <select
                        value={ncfConfig.ecfProvider}
                        onChange={e => setNcfConfig(p => ({ ...p, ecfProvider: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="alanube">Alanube (alanube.co)</option>
                        <option value="ef2">ef2 (ef2.do)</option>
                        <option value="ecfssd">ECF-SSD (ecf.ssd.com.do)</option>
                        <option value="dgii_direct">DGII Directo (requiere certificado digital)</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        Los proveedores certificados simplifican la integración con la DGII sin necesidad de certificado digital propio.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Key del Proveedor</label>
                      <input
                        type="password"
                        value={ncfConfig.ecfApiKey}
                        onChange={e => setNcfConfig(p => ({ ...p, ecfApiKey: e.target.value }))}
                        placeholder="sk_live_YOUR_KEY_HERE"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 font-mono text-sm"
                      />
                    </div>

                    {ncfConfig.ecfProvider === 'dgii_direct' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL Ambiente DGII</label>
                        <select
                          value={ncfConfig.ecfApiUrl}
                          onChange={e => setNcfConfig(p => ({ ...p, ecfApiUrl: e.target.value }))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400"
                        >
                          <option value="https://ecf.dgii.gov.do/TesteCF">Pre-certificación (TesteCF)</option>
                          <option value="https://ecf.dgii.gov.do/CerteCF">Certificación (CerteCF)</option>
                          <option value="https://ecf.dgii.gov.do/eCF">Producción (eCF)</option>
                        </select>
                      </div>
                    )}

                    <div className="bg-white border border-yellow-300 rounded-lg p-3 text-xs text-yellow-800">
                      <p className="font-semibold mb-1">📌 Pasos para activar e-CF con la DGII:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>Completar el formulario FI-GDF-016 en la Oficina Virtual</li>
                        <li>Obtener certificado digital de procedimiento tributario</li>
                        <li>Realizar pruebas en ambiente TesteCF</li>
                        <li>Solicitar acceso al ambiente de producción (eCF)</li>
                        <li>O contratar proveedor certificado (más rápido)</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Botón guardar NCF */}
                <button
                  type="button"
                  disabled={savingNcf}
                  onClick={async () => {
                    setSavingNcf(true);
                    try {
                      localStorage.setItem('dgii_ncf_config', JSON.stringify(ncfConfig));
                      toast.success('Configuración NCF guardada correctamente');
                    } catch (_) {
                      toast.error('Error al guardar configuración NCF');
                    } finally {
                      setSavingNcf(false);
                    }
                  }}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingNcf ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : '💾'}
                  {savingNcf ? 'Guardando...' : 'Guardar Configuración NCF'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Información adicional sobre licencias para todos los usuarios */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Información de Licencia</h2>
          <p className="text-gray-600 mb-4">
            Este sistema utiliza un modelo de licencias por suscripción. Cada usuario debe tener una licencia válida para acceder al sistema.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Tipos de licencia:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><span className="font-medium">Licencia de prueba:</span> 5 días de acceso gratuito</li>
              <li><span className="font-medium">Licencia completa:</span> 30 días de acceso</li>
              <li><span className="font-medium">Período de gracia:</span> 2 días adicionales después del vencimiento</li>
            </ul>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Para renovar tu licencia o solicitar asistencia, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default BusinessSettings;
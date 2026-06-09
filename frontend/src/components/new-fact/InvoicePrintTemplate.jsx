import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import CashPaymentDisplay from './CashPaymentDisplay';

const InvoicePrintTemplate = forwardRef(({ cart, customer, totals, paymentMethod, businessInfo, currentUser, invoiceNumber, isCredit, clientName, cashReceivedValue }, ref) => {
    const formatDate = (date) => {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        return new Date(date).toLocaleDateString('es-ES', options);
    };

    const formatTime = (date) => {
        const options = { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true
        };
        return new Date(date).toLocaleTimeString('es-ES', options);
    };

    // Determinar la moneda a mostrar
    const currencySymbol = businessInfo?.currency || 'RD$';

    // Utilidad para obtener el nombre real del cajero conectado
    const getCashierName = () => {
        console.log("[InvoicePrintTemplate] Iniciando getCashierName...");

        // 1. Intentar obtener el usuario del contexto de autenticación (si está disponible)
        try {
            const authUser = JSON.parse(localStorage.getItem('user'));
            if (authUser && (authUser.name || authUser.username)) {
                console.log("[InvoicePrintTemplate] Usando authUser:", authUser.name || authUser.username);
                return authUser.name || authUser.username;
            }
        } catch (e) {
            console.warn("[InvoicePrintTemplate] Error al leer 'user' del localStorage:", e);
        }

        // 2. Intentar obtener el nombre del localStorage
        const drawerUserName = localStorage.getItem('userName');
        console.log("[InvoicePrintTemplate] localStorage 'userName':", drawerUserName);
        if (drawerUserName) {
            console.log("[InvoicePrintTemplate] Usando drawerUserName:", drawerUserName);
            return drawerUserName;
        }

        // 3. Usar la prop currentUser si está disponible
        console.log("[InvoicePrintTemplate] Prop currentUser:", currentUser);
        if (currentUser) {
            if (currentUser.name) {
                console.log("[InvoicePrintTemplate] Usando currentUser.name:", currentUser.name);
                return currentUser.name;
            }
            if (currentUser.username) {
                console.log("[InvoicePrintTemplate] Usando currentUser.username:", currentUser.username);
                return currentUser.username;
            }
            if (currentUser.email) {
                console.log("[InvoicePrintTemplate] Usando currentUser.email:", currentUser.email);
                return currentUser.email;
            }
        }

        // 4. Intentar obtener el usuario de localStorage
        try {
            const storedUserString = localStorage.getItem('currentUser');
            console.log("[InvoicePrintTemplate] localStorage 'currentUser' (string):", storedUserString);
            if (storedUserString) {
                const parsedUser = JSON.parse(storedUserString);
                console.log("[InvoicePrintTemplate] localStorage 'currentUser' (parsed):", parsedUser);
                if (parsedUser.name) {
                    console.log("[InvoicePrintTemplate] Usando parsedUser.name:", parsedUser.name);
                    return parsedUser.name;
                }
                if (parsedUser.username) {
                    console.log("[InvoicePrintTemplate] Usando parsedUser.username:", parsedUser.username);
                    return parsedUser.username;
                }
                if (parsedUser.email) {
                    console.log("[InvoicePrintTemplate] Usando parsedUser.email:", parsedUser.email);
                    return parsedUser.email;
                }
            }
        } catch (e) {
            console.warn("[InvoicePrintTemplate] Error al leer 'currentUser' (objeto) de localStorage:", e);
        }
        
        // 5. Intentar con otros valores de localStorage
        const legacyCurrentUserName = localStorage.getItem('currentUserName');
        console.log("[InvoicePrintTemplate] localStorage 'currentUserName':", legacyCurrentUserName);
        if (legacyCurrentUserName) {
            console.log("[InvoicePrintTemplate] Usando legacyCurrentUserName:", legacyCurrentUserName);
            return legacyCurrentUserName;
        }
        
        // 6. Intentar con sessionStorage
        const legacySessionUserName = sessionStorage.getItem('userName');
        console.log("[InvoicePrintTemplate] sessionStorage 'userName':", legacySessionUserName);
        if (legacySessionUserName) {
            console.log("[InvoicePrintTemplate] Usando legacySessionUserName:", legacySessionUserName);
            return legacySessionUserName;
        }

        console.log("[InvoicePrintTemplate] Fallback a 'Cajero'");
        return 'Cajero'; // Fallback final
    };

    // Obtener el monto en efectivo de cashReceivedValue (nueva prop) o del objeto totals
    const effectiveCashReceived = cashReceivedValue !== undefined ? cashReceivedValue : (totals.cashReceived || 0);
    
    // IMPORTANTE: Verificar el método de pago real - nunca mostrar efectivo en compras fiadas
    // Si es una compra fiada, ignorar cualquier valor de efectivo
    const actualPaymentMethod = isCredit ? 'credit' : paymentMethod;
    
    // Valor para depuración
    // console.log('InvoicePrintTemplate - Render con valores:', {
    //     paymentMethod: actualPaymentMethod,
    //     isCredit,
    //     total: totals.total,
    //     cashReceived: effectiveCashReceived,
    //     fromCashReceivedProp: cashReceivedValue !== undefined
    // });

    return (
        <div ref={ref} className="p-6 max-w-md mx-auto">
            <div className="text-center mb-4">
                <h1 className="text-2xl font-bold">{businessInfo.name || 'Mi Negocio'}</h1>
                {businessInfo.slogan && (
                    <p className="text-sm italic">{businessInfo.slogan}</p>
                )}
                <p className="text-sm">{businessInfo.address ? businessInfo.address : 'Dirección no disponible'}</p>
                <p className="text-sm">Tel: {businessInfo.phone ? businessInfo.phone : 'Teléfono no disponible'}</p>
                <p className="text-sm">RNC: {businessInfo.taxId || businessInfo.rnc || 'RNC no disponible'}</p>
                <hr className="my-2" />
                <div className="flex justify-between text-sm">
                    <span>Fecha: {formatDate(new Date())}</span>
                    <span>Hora: {formatTime(new Date())}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Cajero: {getCashierName()}</span>
                    <span>Tipo de Compra: {invoiceNumber ? (isCredit ? 'Crédito (Fiado)' : 'Factura') : 'Desconocido'}</span>
                </div>
                {invoiceNumber && (
                    <p className="text-sm">Factura Nº: {invoiceNumber}</p>
                )}
                
                {/* Mostrar distintivo de compra fiada */}
                {isCredit && (
                    <div className="mt-2 p-2 border-2 border-red-500 rounded text-center">
                        <h3 className="font-bold text-red-600">COMPRA FIADA</h3>
                        <p className="text-sm">{clientName || customer.name}</p>
                    </div>
                )}
            </div>

            <div className="border-t border-b py-2 mb-4">
                <h2 className="font-bold">Cliente:</h2>
                <p>{isCredit ? (clientName || customer.name) : (customer.name || 'Cliente General')}</p>
                {customer.email && <p className="text-sm">{customer.email}</p>}
                {customer.phone && <p className="text-sm">Tel: {customer.phone}</p>}
            </div>

            <table className="w-full mb-4">
                <thead>
                    <tr className="border-b">
                        <th className="text-left">Descripción</th>
                        <th className="text-center">Cant.</th>
                        <th className="text-right">Precio</th>
                        <th className="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {cart.map((item, index) => (
                        <tr key={index} className="border-b">
                            <td className="text-left overflow-hidden text-ellipsis">
                                 {item.name} 
                                {/* Productos derivados de paquete por peso */}
                                {item.isUnitOfPackage && item.parentPackage && item.packageContentType === 'peso' && item.weightUnit && (
                                  <span className="text-xs font-semibold ml-1 bg-green-100 text-green-800 px-1 rounded">[{item.weightUnit}]</span>
                                )}
                                {/* Productos normales por paquete */}
                                {!item.isUnitOfPackage && item.packageType && item.packageContentType === 'unidad' && (
                                  <span className="text-xs font-semibold ml-1 bg-indigo-100 text-indigo-800 px-1 rounded">[{item.packageType}]</span>
                                )}
                                {/* Productos por peso */}
                                {((item.packageContentType === 'peso' || item.unitType === 'peso') && item.weightUnit && !item.isUnitOfPackage) && (
                                  <span className="text-xs font-semibold ml-1 bg-green-100 text-green-800 px-1 rounded">[{item.weightUnit}]</span>
                                )}
                                {/* Compatibilidad con campo weightInfo para productos por peso */}
                                {item.weightInfo && item.weightInfo.unit && !item.weightUnit && !item.isUnitOfPackage &&
                                  <span className="text-xs font-semibold ml-1 bg-green-100 text-green-800 px-1 rounded">[{item.weightInfo.unit}]</span>
                                }
                                {/* Fallback para cualquier otro producto derivado */}
                                {item.isUnitOfPackage && !((item.packageContentType === 'peso' && item.weightUnit)) &&
                                  <span className="text-xs font-semibold ml-1 bg-amber-100 text-amber-800 px-1 rounded">[Unidad]</span>
                                }
                            </td>
                            <td className="text-center">{item.quantity}</td>
                            <td className="text-right">{currencySymbol}{parseFloat(item.salePrice).toFixed(2)}</td>
                            <td className="text-right">
                                {currencySymbol}{(item.quantity * parseFloat(item.salePrice)).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-t pt-2">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{currencySymbol}{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.tax > 0 && (
                    <div className="flex justify-between">
                        <span>ITBIS ({(totals.taxRate || 18)}%):</span>
                        <span>{currencySymbol}{totals.tax.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                    <span>Total:</span>
                    <span>{currencySymbol}{totals.total.toFixed(2)}</span>
                </div>
                <div className="mt-3 pt-2 border-t">
                    <div className="flex justify-between">
                        <span>Método de pago:</span>
                        <span>{
                            isCredit ? 'Crédito (Fiado)' :
                            paymentMethod === 'cash' ? 'Efectivo' :
                            paymentMethod === 'card' || paymentMethod === 'credit_card' ? 'Tarjeta' :
                            paymentMethod === 'bank_transfer' ? 'Transferencia' :
                            'Transferencia'
                        }</span>
                    </div>
                </div>
                
                {/* Para compras fiadas, mostrar información adicional */}
                {isCredit && (
                    <div className="flex justify-between mt-2">
                        <span>Estado:</span>
                        <span>Pendiente de pago</span>
                    </div>
                )}
                
                {/* IMPORTANTE: Usar el nuevo componente SOLO para pagos en efectivo y NUNCA para crédito */}
                {!isCredit && actualPaymentMethod === 'cash' && (
                    <CashPaymentDisplay 
                        total={totals.total} 
                        cashReceived={effectiveCashReceived}
                        currencySymbol={currencySymbol}
                    />
                )}
            </div>

            <div className="text-center mt-6 text-sm">
                {isCredit && (
                    <div className="mb-3 p-2 border border-gray-300 rounded">
                        <p className="font-bold">COMPROBANTE DE DEUDA</p>
                        <p>Esta factura representa una deuda pendiente de pago.</p>
                    </div>
                )}
                <p className="mt-4 border-t pt-2"><span className="font-semibold">Cajero:</span> {getCashierName()}</p>
                <p className="font-semibold text-sm">{businessInfo.footer || '¡Gracias por su compra!'}</p>
                {businessInfo.website && (
                    <p className="mt-1">{businessInfo.website}</p>
                )}
            </div>
        </div>
    );
});

InvoicePrintTemplate.propTypes = {
    cart: PropTypes.array.isRequired,
    customer: PropTypes.object.isRequired,
    totals: PropTypes.object.isRequired,
    paymentMethod: PropTypes.string.isRequired,
    businessInfo: PropTypes.object.isRequired,
    currentUser: PropTypes.object,
    invoiceNumber: PropTypes.string,
    isCredit: PropTypes.bool,
    clientName: PropTypes.string,
    // Nueva prop para pasar directamente el valor de efectivo recibido
    cashReceivedValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';

export default InvoicePrintTemplate;
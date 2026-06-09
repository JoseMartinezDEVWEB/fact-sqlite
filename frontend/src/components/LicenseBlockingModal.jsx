import React from 'react';
import { useAuth } from '../context/AuthContext'; // Importar useAuth para la función de logout

// Componente del Modal de Bloqueo de Licencia
// Este modal se muestra cuando la licencia del usuario ha expirado o está bloqueada,
// impidiendo el uso de la aplicación hasta que se resuelva la situación.
const LicenseBlockingModal = ({ open, title, message }) => {
  const { logout } = useAuth(); // Obtener la función de logout del contexto de autenticación
  // Si el modal no debe estar abierto, no renderizar nada
  if (!open) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.message}>{message}</p>
        <p style={styles.contactInfo}>Para continuar utilizando la aplicación, por favor, póngase en contacto con el administrador del sistema.</p>
        <button onClick={logout} style={styles.logoutButton}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

// Estilos para el componente del modal
const styles = {
  overlay: { // Estilo para la capa semi-transparente que cubre toda la pantalla
    position: 'fixed', // Posición fija para cubrir toda la ventana
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Fondo oscuro semi-transparente
    display: 'flex',
    alignItems: 'center', // Centrar verticalmente
    justifyContent: 'center', // Centrar horizontalmente
    zIndex: 2000, // Alto z-index para asegurar que esté por encima de otros elementos
    backdropFilter: 'blur(5px)', // Opcional: efecto de desenfoque para el fondo
  },
  modal: { // Estilo para el contenedor principal del modal
    backgroundColor: '#fff', // Fondo blanco
    padding: '30px', // Espaciado interno
    borderRadius: '8px', // Bordes redondeados
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)', // Sombra para dar profundidad
    textAlign: 'center', // Texto centrado
    maxWidth: '500px', // Ancho máximo
    width: '90%', // Ancho responsivo
    borderTop: '5px solid #dc3545', // Borde superior rojo para énfasis
  },
  title: { // Estilo para el título del modal
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '1.8em', // Tamaño de fuente grande
    color: '#dc3545', // Color rojo para el título
    fontWeight: 'bold', // Texto en negrita
  },
  message: { // Estilo para el mensaje principal del modal
    marginBottom: '15px',
    fontSize: '1.1em', // Tamaño de fuente ligeramente más grande
    color: '#333', // Color de texto oscuro
    lineHeight: '1.6', // Altura de línea para mejor legibilidad
  },
  contactInfo: { // Estilo para la información de contacto
    marginTop: '20px',
    fontSize: '0.9em', // Tamaño de fuente más pequeño
    color: '#555', // Color de texto gris
  },
  logoutButton: { // Estilo para el botón de cerrar sesión
    marginTop: '25px',
    padding: '10px 20px',
    backgroundColor: '#6c757d', // Color gris para el botón de logout
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
    transition: 'background-color 0.3s ease',
  },
};

export default LicenseBlockingModal;

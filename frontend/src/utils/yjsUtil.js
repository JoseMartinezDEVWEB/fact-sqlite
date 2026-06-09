/**
 * Este archivo sirve como punto único de entrada para YJS.
 * Todas las importaciones de YJS en el proyecto deben realizarse desde aquí
 * para evitar el error "Yjs was already imported".
 * 
 * Si recibes el error:
 * "Yjs was already imported. This breaks constructor checks and will lead to issues!"
 * Asegúrate de que toda importación de YJS se haga desde este archivo.
 */

// Importa YJS solamente una vez aquí
let Y;

try {
  // Importa dinámicamente YJS solo si realmente se necesita
  Y = window.Y;
} catch (_) {
  console.warn('YJS no está disponible en este entorno');
}

// Exportar YJS para que sea usado en todo el proyecto
export default Y;

// También exporta cualquier otra dependencia relacionada con YJS
// (como y-websocket, y-indexeddb, etc.) usando la misma técnica 
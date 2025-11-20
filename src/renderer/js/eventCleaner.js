// src/renderer/js/eventCleaner.js
// Sistema global para limpiar eventos y prevenir acumulación

class EventCleaner {
  constructor() {
    this.registeredEvents = new Map();
  }

  /**
   * Registra un event listener con limpieza automática
   */
  addEventListener(element, event, handler, options = {}) {
    if (!element) return;

    const key = this.generateKey(element, event);
    
    // Eliminar listener anterior si existe
    this.removeEventListener(element, event);
    
    // Agregar nuevo listener
    element.addEventListener(event, handler, options);
    
    // Guardar referencia para limpieza posterior
    this.registeredEvents.set(key, { element, event, handler, options });
  }

  /**
   * Elimina un event listener específico
   */
  removeEventListener(element, event) {
    if (!element) return;

    const key = this.generateKey(element, event);
    const registered = this.registeredEvents.get(key);
    
    if (registered) {
      registered.element.removeEventListener(
        registered.event, 
        registered.handler, 
        registered.options
      );
      this.registeredEvents.delete(key);
    }
  }

  /**
   * Limpia TODOS los event listeners registrados
   */
  cleanAll() {
    this.registeredEvents.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options);
      }
    });
    this.registeredEvents.clear();
  }

  /**
   * Limpia todos los modales del DOM
   */
  cleanModals() {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
      modal.classList.remove('active');
      modal.style.display = 'none';
    });
  }

  /**
   * Reinicia todos los formularios
   */
  resetForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.reset();
      // Habilitar todos los inputs
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.disabled = false;
        input.readOnly = false;
      });
    });
  }

  /**
   * Limpieza completa al cambiar de página
   */
  fullCleanup() {
    this.cleanAll();
    this.cleanModals();
    this.resetForms();
  }

  /**
   * Genera una clave única para identificar el event listener
   */
  generateKey(element, event) {
    const id = element.id || element.className || 'anonymous';
    return `${id}_${event}_${Date.now()}`;
  }
}

// Instancia global
window.eventCleaner = new EventCleaner();

// Limpieza automática antes de navegar
window.addEventListener('beforeunload', () => {
  window.eventCleaner.fullCleanup();
});

module.exports = EventCleaner;
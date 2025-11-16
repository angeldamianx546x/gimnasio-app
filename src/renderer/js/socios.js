const { ipcRenderer } = require("electron");

class SociosManager {
  constructor() {
    this.currentUser = null;
    this.socios = [];
    this.socioActual = null;
    this.init();
  }

  async init() {
    await this.loadUserData();
    this.bindEvents();
    this.updateUserInterface();
    await this.loadSocios();
    await this.loadEstadisticas();
  }

  async loadUserData() {
    try {
      this.currentUser = await ipcRenderer.invoke("get-current-user");
    } catch (error) {
      console.error("Error cargando usuario:", error);
    }
  }

  bindEvents() {
    // Navegación
    this.bindNavigation();

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // Botón Nuevo Socio
    const btnNuevoSocio = document.getElementById("btnNuevoSocio");
    if (btnNuevoSocio) {
      btnNuevoSocio.addEventListener("click", () => this.abrirModalNuevo());
    }

    // Botones del Modal
    const btnCerrarModal = document.getElementById("btnCerrarModal");
    const btnCancelar = document.getElementById("btnCancelar");
    const btnGuardarSocio = document.getElementById("btnGuardarSocio");

    if (btnCerrarModal) btnCerrarModal.addEventListener("click", () => this.cerrarModal());
    if (btnCancelar) btnCancelar.addEventListener("click", () => this.cerrarModal());
    if (btnGuardarSocio) btnGuardarSocio.addEventListener("click", () => this.guardarSocio());

    // Checkbox Estudiante
    const checkEstudiante = document.getElementById("checkEstudiante");
    if (checkEstudiante) {
      checkEstudiante.addEventListener("change", (e) => {
        const estudianteFields = document.getElementById("estudianteFields");
        if (estudianteFields) {
          estudianteFields.classList.toggle("active", e.target.checked);
        }
      });
    }

    // Búsqueda
    const searchSocios = document.getElementById("searchSocios");
    if (searchSocios) {
      searchSocios.addEventListener("input", (e) => {
        this.buscarSocios(e.target.value);
      });
    }

    // Filtro de estado
    const filterEstado = document.getElementById("filterEstado");
    if (filterEstado) {
      filterEstado.addEventListener("change", (e) => {
        this.filtrarPorEstado(e.target.value);
      });
    }

    // Botón exportar
    const btnExportar = document.getElementById("btnExportar");
    if (btnExportar) {
      btnExportar.addEventListener("click", () => this.exportarSocios());
    }

    // Cerrar modal de detalle
    const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");
    if (btnCerrarDetalle) {
      btnCerrarDetalle.addEventListener("click", () => this.cerrarModalDetalle());
    }

    // Modal de Renovación
    const btnCerrarRenovacion = document.getElementById("btnCerrarRenovacion");
    const btnCancelarRenovacion = document.getElementById("btnCancelarRenovacion");
    const btnConfirmarRenovacion = document.getElementById("btnConfirmarRenovacion");

    if (btnCerrarRenovacion) {
      btnCerrarRenovacion.addEventListener("click", () => this.cerrarModalRenovacion());
    }
    if (btnCancelarRenovacion) {
      btnCancelarRenovacion.addEventListener("click", () => this.cerrarModalRenovacion());
    }
    if (btnConfirmarRenovacion) {
      btnConfirmarRenovacion.addEventListener("click", () => this.confirmarRenovacion());
    }

    // Calcular fecha al cambiar tipo de membresía en renovación
    const tipoMembresiaRenovacion = document.querySelector('[name="tipo_membresia_renovacion"]');
    if (tipoMembresiaRenovacion) {
      tipoMembresiaRenovacion.addEventListener("change", () => {
        this.calcularNuevaFechaVencimiento();
        this.actualizarMontoRenovacion();
      });
    }

    // Calcular fecha al cambiar fecha de renovación
    const fechaRenovacion = document.querySelector('[name="fecha_renovacion"]');
    if (fechaRenovacion) {
      fechaRenovacion.addEventListener("change", () => {
        this.calcularNuevaFechaVencimiento();
      });
    }

    // Checkbox descuento en renovación
    const checkDescuentoRenovacion = document.querySelector('[name="aplicar_descuento_renovacion"]');
    if (checkDescuentoRenovacion) {
      checkDescuentoRenovacion.addEventListener("change", (e) => {
        const descuentoField = document.getElementById("descuentoRenovacionField");
        if (descuentoField) {
          descuentoField.style.display = e.target.checked ? "block" : "none";
        }
        this.calcularMontoFinal();
      });
    }

    // Calcular monto final al cambiar descuento
    const porcentajeDescuento = document.querySelector('[name="porcentaje_descuento_renovacion"]');
    if (porcentajeDescuento) {
      porcentajeDescuento.addEventListener("input", () => {
        this.calcularMontoFinal();
      });
    }

    // Calcular total automáticamente según tipo de membresía
    const tipoMembresia = document.querySelector('[name="tipo_membresia"]');
    if (tipoMembresia) {
      tipoMembresia.addEventListener("change", (e) => {
        const montoPago = document.querySelector('[name="monto_pago"]');
        const precios = {
          diaria: 30,
          semanal: 150,
          mensual: 300
        };
        if (montoPago) {
          montoPago.value = precios[e.target.value] || 0;
        }
      });
    }
  }

  bindNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const page = item.getAttribute("data-page");
        this.navigateToPage(page);
      });
    });
  }

  updateUserInterface() {
    const userInfo = document.getElementById("userInfo");
    if (userInfo && this.currentUser) {
      userInfo.textContent = `${this.currentUser.nombre} (${this.currentUser.tipo})`;
    }

    // Ocultar productos si es empleado
    if (this.currentUser && this.currentUser.tipo === "empleado") {
      const productosNav = document.getElementById("productosNav");
      if (productosNav) {
        productosNav.style.display = "none";
      }
    }
  }

  async loadSocios() {
    try {
      const result = await ipcRenderer.invoke("get-socios");
      
      if (result.success) {
        this.socios = result.socios;
        this.renderSocios(this.socios);
      } else {
        this.mostrarError("Error al cargar socios");
      }
    } catch (error) {
      console.error("Error cargando socios:", error);
      this.mostrarError("Error al cargar socios");
    }
  }

  async loadEstadisticas() {
    try {
      const result = await ipcRenderer.invoke("get-estadisticas-socios");
      
      if (result.success) {
        const stats = result.estadisticas;
        
        const statActivos = document.getElementById("statActivos");
        const statVencidos = document.getElementById("statVencidos");
        const statProximosVencer = document.getElementById("statProximosVencer");
        const statEstudiantes = document.getElementById("statEstudiantes");
        
        if (statActivos) statActivos.textContent = stats.activos;
        if (statVencidos) statVencidos.textContent = stats.vencidos;
        if (statProximosVencer) statProximosVencer.textContent = stats.proximosVencer;
        if (statEstudiantes) statEstudiantes.textContent = stats.estudiantes;
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  }

  renderSocios(socios) {
    const container = document.getElementById("sociosGrid");
    if (!container) return;

    if (socios.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <p>No hay socios registrados</p>
        </div>
      `;
      return;
    }

    const html = socios.map((socio) => this.createSocioCard(socio)).join("");
    container.innerHTML = html;

    // Agregar eventos a las tarjetas
    document.querySelectorAll(".socio-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (!e.target.closest(".socio-card-actions")) {
          const idSocio = card.dataset.id;
          this.verDetalleSocio(idSocio);
        }
      });
    });

    // Eventos botones de acciones
    document.querySelectorAll(".btn-editar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idSocio = btn.closest(".socio-card").dataset.id;
        this.editarSocio(idSocio);
      });
    });

    document.querySelectorAll(".btn-renovar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idSocio = btn.closest(".socio-card").dataset.id;
        this.renovarMembresia(idSocio);
      });
    });

    document.querySelectorAll(".btn-asistencia").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idSocio = btn.closest(".socio-card").dataset.id;
        this.registrarAsistencia(idSocio);
      });
    });
  }

  createSocioCard(socio) {
    const estadoClass = socio.estado === "activo" ? "estado-activo" : "estado-vencido";
    const diasRestantes = socio.dias_restantes || 0;
    let diasClass = "bien";
    
    if (diasRestantes <= 0) {
      diasClass = "critico";
    } else if (diasRestantes <= 7) {
      diasClass = "advertencia";
    }

    const inicial = socio.nombre.charAt(0).toUpperCase();
    const fechaVencimiento = socio.fecha_vencimiento 
      ? new Date(socio.fecha_vencimiento).toLocaleDateString('es-ES')
      : 'Sin registro';

    return `
      <div class="socio-card" data-id="${socio.id_socio}">
        <div class="socio-card-header">
          <div class="socio-foto">${inicial}</div>
          <div class="socio-info-header">
            <div class="socio-nombre">${socio.nombre}</div>
            <div class="socio-codigo">ID: ${socio.id_socio.toString().padStart(4, '0')}</div>
          </div>
        </div>
        
        <div class="socio-card-body">
          <div class="socio-info-row">
            <span class="socio-info-label">Estado:</span>
            <span class="estado-badge ${estadoClass}">
              ${socio.estado || 'Sin registro'}
            </span>
          </div>
          
          <div class="socio-info-row">
            <span class="socio-info-label">Teléfono:</span>
            <span class="socio-info-value">${socio.celular || 'No registrado'}</span>
          </div>
          
          <div class="socio-info-row">
            <span class="socio-info-label">Turno:</span>
            <span class="socio-info-value">${socio.tipo_turno}</span>
          </div>
          
          <div class="socio-info-row">
            <span class="socio-info-label">Vencimiento:</span>
            <span class="socio-info-value">${fechaVencimiento}</span>
          </div>
          
          ${diasRestantes >= 0 ? `
            <div class="socio-info-row">
              <span class="socio-info-label">Días restantes:</span>
              <span class="dias-restantes ${diasClass}">${diasRestantes} días</span>
            </div>
          ` : ''}
          
          ${socio.instituto ? `
            <div class="socio-info-row">
              <span class="socio-info-label">Instituto:</span>
              <span class="socio-info-value">🎓 ${socio.instituto}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="socio-card-actions">
          <button class="btn btn-secondary btn-icon btn-editar" title="Editar">
            ✏️
          </button>
          <button class="btn btn-primary btn-icon btn-renovar" title="Renovar membresía">
            🔄
          </button>
          <button class="btn btn-success btn-icon btn-asistencia" title="Registrar asistencia">
            ✓
          </button>
        </div>
      </div>
    `;
  }

  abrirModalNuevo() {
    this.socioActual = null;
    const modal = document.getElementById("modalSocio");
    const title = document.getElementById("modalSocioTitle");
    const form = document.getElementById("formSocio");

    if (title) title.textContent = "Nuevo Socio";
    if (form) form.reset();
    
    // Establecer fecha de ingreso como hoy
    const fechaIngreso = document.querySelector('[name="fecha_ingreso"]');
    if (fechaIngreso) {
      fechaIngreso.value = new Date().toISOString().split('T')[0];
    }

    // Establecer mes de inscripción
    const mesInscripcion = document.querySelector('[name="mes_inscripcion"]');
    if (mesInscripcion) {
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      mesInscripcion.value = meses[new Date().getMonth()];
    }

    // Ocultar campos de estudiante
    const estudianteFields = document.getElementById("estudianteFields");
    if (estudianteFields) {
      estudianteFields.classList.remove("active");
    }

    modal.classList.add("active");
  }

  cerrarModal() {
    const modal = document.getElementById("modalSocio");
    modal.classList.remove("active");
  }

  cerrarModalDetalle() {
    const modal = document.getElementById("modalDetalleSocio");
    modal.classList.remove("active");
  }

  cerrarModalRenovacion() {
    const modal = document.getElementById("modalRenovacion");
    modal.classList.remove("active");
    this.socioActual = null;
  }

  calcularNuevaFechaVencimiento() {
    const tipoMembresia = document.querySelector('[name="tipo_membresia_renovacion"]');
    const fechaRenovacion = document.querySelector('[name="fecha_renovacion"]');
    const nuevaFechaElement = document.getElementById("nuevaFechaVencimiento");

    if (!tipoMembresia || !fechaRenovacion || !nuevaFechaElement) return;

    const dias = {
      'diaria': 1,
      'semanal': 7,
      'mensual': 30
    };

    const fechaInicio = new Date(fechaRenovacion.value);
    const diasSumar = dias[tipoMembresia.value] || 30;
    
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + diasSumar);

    nuevaFechaElement.textContent = fechaFin.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  actualizarMontoRenovacion() {
    const tipoMembresia = document.querySelector('[name="tipo_membresia_renovacion"]');
    const montoBase = document.getElementById("montoBaseRenovacion");

    if (!tipoMembresia || !montoBase) return;

    const precios = {
      'diaria': 30,
      'semanal': 150,
      'mensual': 300
    };

    const precio = precios[tipoMembresia.value] || 300;
    montoBase.textContent = `${precio.toFixed(2)}`;
    
    // Actualizar campo oculto del monto base
    const montoBaseInput = document.querySelector('[name="monto_base_renovacion"]');
    if (montoBaseInput) {
      montoBaseInput.value = precio;
    }

    this.calcularMontoFinal();
  }

  calcularMontoFinal() {
    const aplicarDescuento = document.querySelector('[name="aplicar_descuento_renovacion"]');
    const porcentajeDescuento = document.querySelector('[name="porcentaje_descuento_renovacion"]');
    const montoBase = parseFloat(document.querySelector('[name="monto_base_renovacion"]')?.value || 0);
    const montoFinalElement = document.getElementById("montoFinalRenovacion");
    const descuentoElement = document.getElementById("descuentoAplicado");

    if (!montoFinalElement) return;

    let montoFinal = montoBase;
    let descuento = 0;

    if (aplicarDescuento && aplicarDescuento.checked && porcentajeDescuento) {
      const porcentaje = parseFloat(porcentajeDescuento.value) || 0;
      descuento = (montoBase * porcentaje) / 100;
      montoFinal = montoBase - descuento;
    }

    montoFinalElement.textContent = `${montoFinal.toFixed(2)}`;
    
    if (descuentoElement) {
      if (descuento > 0) {
        descuentoElement.textContent = `Descuento: -${descuento.toFixed(2)}`;
        descuentoElement.style.display = 'block';
      } else {
        descuentoElement.style.display = 'none';
      }
    }
  }

  async confirmarRenovacion() {
    if (!this.socioActual) return;

    const tipoMembresia = document.querySelector('[name="tipo_membresia_renovacion"]');
    const fechaRenovacion = document.querySelector('[name="fecha_renovacion"]');
    const montoBase = parseFloat(document.querySelector('[name="monto_base_renovacion"]')?.value || 0);
    const aplicarDescuento = document.querySelector('[name="aplicar_descuento_renovacion"]');
    const porcentajeDescuento = document.querySelector('[name="porcentaje_descuento_renovacion"]');
    const metodoPago = document.querySelector('[name="metodo_pago_renovacion"]');
    const observaciones = document.querySelector('[name="observaciones_renovacion"]');

    if (!tipoMembresia || !fechaRenovacion || !metodoPago) {
      this.mostrarError("Por favor completa todos los campos requeridos");
      return;
    }

    // Calcular monto final
    let montoFinal = montoBase;
    let descuentoAplicado = 0;
    let porcentaje = 0;

    if (aplicarDescuento && aplicarDescuento.checked && porcentajeDescuento) {
      porcentaje = parseFloat(porcentajeDescuento.value) || 0;
      descuentoAplicado = (montoBase * porcentaje) / 100;
      montoFinal = montoBase - descuentoAplicado;
    }

    const renovacionData = {
      id_socio: this.socioActual.id_socio,
      tipo_membresia: tipoMembresia.value,
      fecha_renovacion: fechaRenovacion.value,
      monto: montoFinal,
      metodo_pago: metodoPago.value,
      descuento_aplicado: descuentoAplicado > 0,
      porcentaje_descuento: porcentaje,
      observaciones: observaciones ? observaciones.value : null
    };

    try {
      const result = await ipcRenderer.invoke("renovar-membresia", renovacionData);
      
      if (result.success) {
        this.mostrarExito(`Membresía renovada correctamente.\nNueva fecha de vencimiento: ${result.fecha_vencimiento}`);
        this.cerrarModalRenovacion();
        await this.loadSocios();
        await this.loadEstadisticas();
      } else {
        this.mostrarError(result.message || "Error al renovar membresía");
      }
    } catch (error) {
      console.error("Error al renovar membresía:", error);
      this.mostrarError("Error al renovar membresía");
    }
  }

  async guardarSocio() {
    const form = document.getElementById("formSocio");
    const formData = new FormData(form);
    
    // Validar campos requeridos
    if (!formData.get("nombre_completo") || !formData.get("celular") || 
        !formData.get("fecha_ingreso") || !formData.get("monto_pago")) {
      this.mostrarError("Por favor completa todos los campos obligatorios");
      return;
    }

    // Preparar datos
    const socioData = {
      nombre: formData.get("nombre_completo"),
      celular: formData.get("celular"),
      tipo_turno: formData.get("tipo_turno") || "matutino",
      instituto: formData.get("es_estudiante") ? formData.get("nombre_instituto") : null,
      fecha_ingreso: formData.get("fecha_ingreso"),
      mes_inscripcion: this.getMesNombre(new Date(formData.get("fecha_ingreso")).getMonth()),
      tipo_membresia: formData.get("tipo_membresia"),
      monto_pago: parseFloat(formData.get("monto_pago"))
    };

    try {
      const result = await ipcRenderer.invoke("registrar-socio", socioData);
      
      if (result.success) {
        this.mostrarExito("Socio registrado correctamente");
        this.cerrarModal();
        await this.loadSocios();
        await this.loadEstadisticas();
      } else {
        this.mostrarError(result.message || "Error al registrar socio");
      }
    } catch (error) {
      console.error("Error al guardar socio:", error);
      this.mostrarError("Error al guardar socio");
    }
  }

  getMesNombre(mes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes];
  }

  async buscarSocios(query) {
    if (!query.trim()) {
      this.renderSocios(this.socios);
      return;
    }

    try {
      const result = await ipcRenderer.invoke("buscar-socios", query);
      
      if (result.success) {
        this.renderSocios(result.socios);
      }
    } catch (error) {
      console.error("Error buscando socios:", error);
    }
  }

  filtrarPorEstado(estado) {
    if (!estado) {
      this.renderSocios(this.socios);
      return;
    }

    const sociosFiltrados = this.socios.filter(socio => socio.estado === estado);
    this.renderSocios(sociosFiltrados);
  }

  async registrarAsistencia(idSocio) {
    try {
      const result = await ipcRenderer.invoke("registrar-asistencia", parseInt(idSocio));
      
      if (result.success) {
        this.mostrarExito(result.message);
      } else {
        if (result.vencido) {
          const renovar = await ipcRenderer.invoke("show-confirmation", {
            title: "Membresía Vencida",
            message: `${result.message}\n\n¿Deseas renovar la membresía?`
          });
          
          if (renovar) {
            this.renovarMembresia(idSocio);
          }
        } else {
          this.mostrarError(result.message);
        }
      }
    } catch (error) {
      console.error("Error al registrar asistencia:", error);
      this.mostrarError("Error al registrar asistencia");
    }
  }

  editarSocio(idSocio) {
    // Por implementar
    console.log("Editar socio:", idSocio);
    this.mostrarInfo("Funcionalidad en desarrollo");
  }

  async renovarMembresia(idSocio) {
    const socio = this.socios.find(s => s.id_socio === parseInt(idSocio));
    if (!socio) return;

    this.socioActual = socio;
    
    // Abrir modal de renovación
    const modal = document.getElementById("modalRenovacion");
    const nombreSocio = document.getElementById("nombreSocioRenovacion");
    const estadoActual = document.getElementById("estadoActualRenovacion");
    const fechaVencimiento = document.getElementById("fechaVencimientoActual");
    
    if (nombreSocio) nombreSocio.textContent = socio.nombre;
    if (estadoActual) {
      const estado = socio.estado === 'activo' ? 'Activo ✅' : 'Vencido ❌';
      estadoActual.textContent = estado;
      estadoActual.style.color = socio.estado === 'activo' ? 'var(--success-color)' : 'var(--error-color)';
    }
    
    if (fechaVencimiento) {
      const fecha = socio.fecha_vencimiento 
        ? new Date(socio.fecha_vencimiento).toLocaleDateString('es-ES')
        : 'Sin registro';
      fechaVencimiento.textContent = fecha;
    }

    // Establecer fecha de renovación como hoy
    const fechaRenovacion = document.querySelector('[name="fecha_renovacion"]');
    if (fechaRenovacion) {
      fechaRenovacion.value = new Date().toISOString().split('T')[0];
    }

    // Calcular nueva fecha de vencimiento al cambiar tipo de membresía
    this.calcularNuevaFechaVencimiento();

    modal.classList.add("active");
  }

  verDetalleSocio(idSocio) {
    const socio = this.socios.find(s => s.id_socio === parseInt(idSocio));
    if (!socio) return;

    const modal = document.getElementById("modalDetalleSocio");
    const content = document.getElementById("detalleSocioContent");
    
    const fechaIngreso = new Date(socio.fecha_ingreso).toLocaleDateString('es-ES');
    const fechaVencimiento = socio.fecha_vencimiento 
      ? new Date(socio.fecha_vencimiento).toLocaleDateString('es-ES')
      : 'Sin registro';

    content.innerHTML = `
      <div style="padding: var(--spacing-lg);">
        <div style="text-align: center; margin-bottom: var(--spacing-lg);">
          <div style="width: 100px; height: 100px; border-radius: 50%; 
                      background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
                      display: inline-flex; align-items: center; justify-content: center;
                      font-size: 3rem; color: white;">
            ${socio.nombre.charAt(0).toUpperCase()}
          </div>
          <h2 style="margin-top: var(--spacing-md);">${socio.nombre}</h2>
          <p style="color: var(--text-secondary);">ID: ${socio.id_socio.toString().padStart(4, '0')}</p>
        </div>

        <div style="display: grid; gap: var(--spacing-md);">
          <div class="socio-info-row">
            <strong>Estado:</strong>
            <span class="estado-badge ${socio.estado === 'activo' ? 'estado-activo' : 'estado-vencido'}">
              ${socio.estado}
            </span>
          </div>
          
          <div class="socio-info-row">
            <strong>Teléfono:</strong>
            <span>${socio.celular}</span>
          </div>
          
          <div class="socio-info-row">
            <strong>Turno:</strong>
            <span>${socio.tipo_turno}</span>
          </div>
          
          <div class="socio-info-row">
            <strong>Fecha de Ingreso:</strong>
            <span>${fechaIngreso}</span>
          </div>
          
          <div class="socio-info-row">
            <strong>Fecha de Vencimiento:</strong>
            <span>${fechaVencimiento}</span>
          </div>
          
          ${socio.dias_restantes >= 0 ? `
            <div class="socio-info-row">
              <strong>Días Restantes:</strong>
              <span class="dias-restantes ${socio.dias_restantes <= 7 ? 'advertencia' : 'bien'}">
                ${socio.dias_restantes} días
              </span>
            </div>
          ` : ''}
          
          ${socio.instituto ? `
            <div class="socio-info-row">
              <strong>Instituto:</strong>
              <span>🎓 ${socio.instituto}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    modal.classList.add("active");
  }

  exportarSocios() {
    console.log("Exportar socios");
    this.mostrarInfo("Funcionalidad de exportación en desarrollo");
  }

  async navigateToPage(page) {
    try {
      await ipcRenderer.invoke("navigate-to", page);
    } catch (error) {
      console.error("Error navegando:", error);
    }
  }

  async handleLogout() {
    const confirmed = await ipcRenderer.invoke("show-confirmation", {
      title: "Cerrar Sesión",
      message: "¿Estás seguro de que quieres cerrar sesión?",
    });

    if (confirmed) {
      try {
        await ipcRenderer.invoke("logout");
      } catch (error) {
        console.error("Error durante logout:", error);
        await ipcRenderer.invoke("navigate-to", "login");
      }
    }
  }

  mostrarError(mensaje) {
    // Implementar notificación de error
    console.error(mensaje);
    alert("Error: " + mensaje);
  }

  mostrarExito(mensaje) {
    // Implementar notificación de éxito
    console.log(mensaje);
    alert(mensaje);
  }

  mostrarInfo(mensaje) {
    // Implementar notificación de información
    console.log(mensaje);
    alert(mensaje);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new SociosManager();
});
const { ipcRenderer } = require("electron");

class SociosManager {
  constructor() {
    this.currentUser = null;
    this.socios = [];
    this.socioActual = null;
    this.pagosActuales = [];
    this.modoEdicion = false;
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

  // Reemplaza el método bindEvents() en socios.js con esta versión corregida:

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

    // Recargar
    const btnRecargar = document.getElementById("btnRecargar");
    if (btnRecargar) {
      btnRecargar.addEventListener("click", () => this.recargarDatos());
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

    // Modal Socio - CORREGIDO
    const btnCerrarModalSocio = document.getElementById("btnCerrarModalSocio");
    const btnCancelarSocio = document.getElementById("btnCancelarSocio");
    const btnGuardarSocio = document.getElementById("btnGuardarSocio");

    if (btnCerrarModalSocio) {
      btnCerrarModalSocio.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModalSocio();
      });
    }
    if (btnCancelarSocio) {
      btnCancelarSocio.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModalSocio();
      });
    }
    if (btnGuardarSocio) {
      btnGuardarSocio.addEventListener("click", (e) => {
        e.preventDefault();
        this.guardarSocio();
      });
    }

    // Checkbox Estudiante
    const checkEstudiante = document.getElementById("checkEstudiante");
    if (checkEstudiante) {
      checkEstudiante.addEventListener("change", (e) => {
        const institutoField = document.getElementById("institutoField");
        if (institutoField) {
          institutoField.style.display = e.target.checked ? "block" : "none";
        }
      });
    }

    // Cambiar tipo de membresía
    const tipoMembresia = document.getElementById("tipoMembresia");
    if (tipoMembresia) {
      tipoMembresia.addEventListener("change", (e) => {
        this.actualizarMonto(e.target.value, "montoPago");
      });
    }

    // Modal Detalle - CORREGIDO
    const btnCerrarDetalle = document.getElementById("btnCerrarDetalle");
    const btnCerrarDetalleFooter = document.getElementById("btnCerrarDetalleFooter");
    const btnRegistrarPago = document.getElementById("btnRegistrarPago");

    if (btnCerrarDetalle) {
      btnCerrarDetalle.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModalDetalle();
      });
    }
    if (btnCerrarDetalleFooter) {
      btnCerrarDetalleFooter.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModalDetalle();
      });
    }
    if (btnRegistrarPago) {
      btnRegistrarPago.addEventListener("click", (e) => {
        e.preventDefault();
        this.abrirModalPago();
      });
    }

    // Modal Pago - CORREGIDO
    const btnCerrarModalPago = document.getElementById("btnCerrarModalPago");
    const btnCancelarPago = document.getElementById("btnCancelarPago");
    const btnConfirmarPago = document.getElementById("btnConfirmarPago");

    if (btnCerrarModalPago) {
      btnCerrarModalPago.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModalPago();
      });
    }
    if (btnCancelarPago) {
      btnCancelarPago.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModalPago();
      });
    }
    if (btnConfirmarPago) {
      btnConfirmarPago.addEventListener("click", (e) => {
        e.preventDefault();
        this.confirmarPago();
      });
    }

    // Tipo de membresía en pago
    const pagoTipoMembresia = document.getElementById("pagoTipoMembresia");
    if (pagoTipoMembresia) {
      pagoTipoMembresia.addEventListener("change", () => {
        this.calcularFechaVencimiento();
      });
    }

    // Fecha de inicio en pago
    const pagoFechaInicio = document.getElementById("pagoFechaInicio");
    if (pagoFechaInicio) {
      pagoFechaInicio.addEventListener("change", () => {
        this.calcularFechaVencimiento();
      });
    }

    // Evento global para tecla ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.cerrarModalSocio();
        this.cerrarModalDetalle();
        this.cerrarModalPago();
      }
    });
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

    if (this.currentUser && this.currentUser.tipo === "empleado") {
      const productosNav = document.getElementById("productosNav");
      if (productosNav) {
        productosNav.style.display = "none";
      }
    }
  }

  async recargarDatos() {
    await this.loadSocios();
    await this.loadEstadisticas();
    this.mostrarExito("Datos recargados correctamente");
  }

  async loadSocios() {
    try {
      const result = await ipcRenderer.invoke("get-socios");

      if (result.success) {
        this.socios = result.socios;
        this.renderTabla(this.socios);
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

        document.getElementById("statActivos").textContent = stats.activos;
        document.getElementById("statVencidos").textContent = stats.vencidos;
        document.getElementById("statProximosVencer").textContent = stats.proximosVencer;
        document.getElementById("statEstudiantes").textContent = stats.estudiantes;
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  }

  renderTabla(socios) {
    const tbody = document.getElementById("sociosTableBody");
    if (!tbody) return;

    if (socios.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: var(--spacing-xl);">
            <div class="empty-state">
              <div class="empty-state-icon">👥</div>
              <p>No hay socios registrados</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const html = socios.map(socio => this.createTableRow(socio)).join("");
    tbody.innerHTML = html;

    // Agregar eventos de doble clic
    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row, index) => {
      row.addEventListener("dblclick", () => {
        this.verDetalleSocio(socios[index]);
      });
    });

    // Eventos de botones de acción
    this.bindActionButtons();
  }

  createTableRow(socio) {
    const diasRestantes = socio.dias_restantes || 0;
    let estadoClass = "";
    let estadoBadgeClass = "";
    let estadoTexto = "";

    if (diasRestantes < 0 || !socio.fecha_vencimiento) {
      estadoClass = "estado-vencido";
      estadoBadgeClass = "vencido";
      estadoTexto = "Vencido";
    } else if (diasRestantes === 0 || diasRestantes === 1) {
      estadoClass = "estado-proximo-vencer";
      estadoBadgeClass = "proximo-vencer";
      estadoTexto = "Por Vencer";
    } else {
      estadoClass = "estado-activo";
      estadoBadgeClass = "activo";
      estadoTexto = "Activo";
    }

    const fechaIngreso = new Date(socio.fecha_ingreso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const fechaVencimiento = socio.fecha_vencimiento
      ? new Date(socio.fecha_vencimiento).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      : 'Sin pago';

    const diasRestantesTexto = diasRestantes >= 0 ? `${diasRestantes} días` : 'Vencido';

    return `
      <tr class="${estadoClass}" data-id="${socio.id_socio}">
        <td><strong>${socio.id_socio.toString().padStart(4, '0')}</strong></td>
        <td><strong>${socio.nombre}</strong></td>
        <td>${socio.celular || 'N/A'}</td>
        <td>${socio.tipo_turno}</td>
        <td>${socio.instituto ? '🎓 ' + socio.instituto : '-'}</td>
        <td>${fechaIngreso}</td>
        <td>${fechaVencimiento}</td>
        <td><strong>${diasRestantesTexto}</strong></td>
        <td>
          <span class="estado-badge ${estadoBadgeClass}">${estadoTexto}</span>
        </td>
        <td>
          <div class="acciones-cell">
            <button class="btn btn-primary btn-icon btn-pagar" 
                    data-id="${socio.id_socio}" 
                    title="Registrar Pago">
              💰
            </button>
            <button class="btn btn-warning btn-icon btn-editar" 
                    data-id="${socio.id_socio}" 
                    title="Editar">
              ✏️
            </button>
            <button class="btn btn-error btn-icon btn-eliminar" 
                    data-id="${socio.id_socio}" 
                    title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  bindActionButtons() {
    // Botones de pago
    document.querySelectorAll(".btn-pagar").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idSocio = parseInt(btn.dataset.id);
        const socio = this.socios.find(s => s.id_socio === idSocio);
        if (socio) {
          this.socioActual = socio;
          this.abrirModalPago();
        }
      });
    });

    // Botones de editar
    document.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idSocio = parseInt(btn.dataset.id);
        const socio = this.socios.find(s => s.id_socio === idSocio);
        if (socio) {
          this.editarSocio(socio);
        }
      });
    });

    // Botones de eliminar
    document.querySelectorAll(".btn-eliminar").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const idSocio = parseInt(btn.dataset.id);
        await this.eliminarSocio(idSocio);
      });
    });
  }

  async verDetalleSocio(socio) {
    this.socioActual = socio;

    // Llenar información básica
    document.getElementById("detNombre").textContent = socio.nombre;
    document.getElementById("detCelular").textContent = socio.celular || 'N/A';
    document.getElementById("detTurno").textContent = socio.tipo_turno;
    document.getElementById("detInstituto").textContent = socio.instituto || 'No es estudiante';

    const fechaIngreso = new Date(socio.fecha_ingreso).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    document.getElementById("detFechaIngreso").textContent = fechaIngreso;
    document.getElementById("detMesInscripcion").textContent = socio.mes_inscripcion;

    // Estado de membresía
    const diasRestantes = socio.dias_restantes || 0;
    let estadoBadge = "";

    if (diasRestantes < 0 || !socio.fecha_vencimiento) {
      estadoBadge = '<span class="estado-badge vencido">Vencido</span>';
    } else if (diasRestantes === 0 || diasRestantes === 1) {
      estadoBadge = '<span class="estado-badge proximo-vencer">Por Vencer</span>';
    } else {
      estadoBadge = '<span class="estado-badge activo">Activo</span>';
    }

    document.getElementById("detEstado").innerHTML = estadoBadge;

    const fechaVencimiento = socio.fecha_vencimiento
      ? new Date(socio.fecha_vencimiento).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      : 'Sin pago registrado';
    document.getElementById("detFechaVencimiento").textContent = fechaVencimiento;
    document.getElementById("detDiasRestantes").textContent = diasRestantes >= 0 ? `${diasRestantes} días` : 'Vencido';

    // Cargar historial de pagos
    await this.cargarHistorialPagos(socio.id_socio);

    // Mostrar modal
    document.getElementById("modalDetalleSocio").classList.add("active");
  }

  async cargarHistorialPagos(idSocio) {
    const container = document.getElementById("historialPagos");

    try {
      const result = await ipcRenderer.invoke("get-historial-pagos", idSocio);

      if (result.success && result.pagos.length > 0) {
        this.pagosActuales = result.pagos;

        const html = `
          <table class="pagos-table">
            <thead>
              <tr>
                <th>Fecha Pago</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Periodo</th>
              </tr>
            </thead>
            <tbody>
              ${result.pagos.map(pago => {
          const fechaPago = new Date(pago.fecha_pago).toLocaleDateString('es-ES');
          const fechaInicio = new Date(pago.fecha_inicio).toLocaleDateString('es-ES');
          const fechaFin = new Date(pago.fecha_fin).toLocaleDateString('es-ES');

          return `
                  <tr>
                    <td>${fechaPago}</td>
                    <td>${pago.tipo}</td>
                    <td><strong>$${parseFloat(pago.monto).toFixed(2)}</strong></td>
                    <td>${fechaInicio} - ${fechaFin}</td>
                  </tr>
                `;
        }).join('')}
            </tbody>
          </table>
        `;

        container.innerHTML = html;
      } else {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: var(--spacing-lg);">No hay pagos registrados</p>';
      }
    } catch (error) {
      console.error("Error cargando historial de pagos:", error);
      container.innerHTML = '<p style="text-align: center; color: var(--error-color);">Error al cargar historial</p>';
    }
  }

  abrirModalNuevo() {
    this.socioActual = null;
    this.modoEdicion = false;

    const form = document.getElementById("formSocio");
    if (form) {
      form.reset();

      // Habilitar todos los inputs explícitamente
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.disabled = false;
        input.readOnly = false;
      });
    }

    // Establecer fecha de ingreso como hoy
    const fechaIngreso = document.querySelector('[name="fecha_ingreso"]');
    if (fechaIngreso) {
      fechaIngreso.value = new Date().toISOString().split('T')[0];
    }

    // Ocultar campo instituto
    const institutoField = document.getElementById("institutoField");
    if (institutoField) {
      institutoField.style.display = "none";
    }

    // Mostrar campos de membresía para nuevo socio
    document.querySelectorAll('.membresia-field').forEach(field => {
      field.style.display = "block";
      const input = field.querySelector('input, select');
      if (input) input.setAttribute('required', 'required');
    });

    document.getElementById("modalSocioTitle").textContent = "Nuevo Socio";
    document.getElementById("modalSocio").classList.add("active");

    // Focus en el primer input
    setTimeout(() => {
      const primerInput = form.querySelector('[name="nombre"]');
      if (primerInput) primerInput.focus();
    }, 100);
  }

  editarSocio(socio) {
  this.socioActual = socio;
  this.modoEdicion = true;
  
  const form = document.getElementById("formSocio");
  if (form) {
    // Habilitar todos los inputs explícitamente
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.disabled = false;
      input.readOnly = false;
    });
    
    // Llenar el formulario con los datos del socio
    form.querySelector('[name="nombre"]').value = socio.nombre;
    form.querySelector('[name="celular"]').value = socio.celular || '';
    form.querySelector('[name="tipo_turno"]').value = socio.tipo_turno;
    form.querySelector('[name="fecha_ingreso"]').value = socio.fecha_ingreso.split('T')[0];
    
    // Manejo de estudiante e instituto
    const checkEstudiante = form.querySelector('[name="es_estudiante"]');
    const institutoField = document.getElementById("institutoField");
    const institutoInput = form.querySelector('[name="instituto"]');
    
    if (socio.instituto) {
      checkEstudiante.checked = true;
      institutoField.style.display = "block";
      institutoInput.value = socio.instituto;
    } else {
      checkEstudiante.checked = false;
      institutoField.style.display = "none";
      institutoInput.value = '';
    }
    
    // Ocultar campos de membresía cuando se edita
    document.querySelectorAll('.membresia-field').forEach(field => {
      field.style.display = "none";
      const input = field.querySelector('input, select');
      if (input) input.removeAttribute('required');
    });
  }
  
  document.getElementById("modalSocioTitle").textContent = "Editar Socio";
  document.getElementById("modalSocio").classList.add("active");
  
  // Focus en el primer input
  setTimeout(() => {
    const primerInput = form.querySelector('[name="nombre"]');
    if (primerInput) {
      primerInput.focus();
      primerInput.select();
    }
  }, 100);
}

  cerrarModalSocio() {
    document.getElementById("modalSocio").classList.remove("active");
  }

  cerrarModalDetalle() {
    document.getElementById("modalDetalleSocio").classList.remove("active");
    this.socioActual = null;
  }

 abrirModalPago() {
  if (!this.socioActual) {
    this.mostrarError("No se ha seleccionado ningún socio");
    return;
  }
  
  // Cerrar modal de detalle si está abierto
  this.cerrarModalDetalle();
  
  const form = document.getElementById("formPago");
  if (form) {
    form.reset();
    
    // Habilitar todos los inputs explícitamente
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.disabled = false;
      input.readOnly = false;
    });
  }
  
  document.getElementById("pagoIdSocio").value = this.socioActual.id_socio;
  document.getElementById("pagoSocioNombre").textContent = this.socioActual.nombre;
  
  const diasRestantes = this.socioActual.dias_restantes || 0;
  let estadoTexto = "";
  
  if (diasRestantes < 0 || !this.socioActual.fecha_vencimiento) {
    estadoTexto = "❌ Membresía Vencida";
  } else if (diasRestantes === 0 || diasRestantes === 1) {
    estadoTexto = "⚠️ Próximo a Vencer";
  } else {
    estadoTexto = `✅ Activo (${diasRestantes} días restantes)`;
  }
  
  document.getElementById("pagoEstadoActual").textContent = estadoTexto;
  
  // Calcular fechas
  this.calcularFechaVencimiento();
  
  document.getElementById("modalPago").classList.add("active");
  
  // Focus en el select de tipo membresía
  setTimeout(() => {
    const selectMembresia = document.getElementById("pagoTipoMembresia");
    if (selectMembresia) selectMembresia.focus();
  }, 100);
}

  cerrarModalPago() {
    document.getElementById("modalPago").classList.remove("active");
  }

  actualizarMonto(tipo, elementId) {
    const precios = {
      diaria: 30,
      semanal: 150,
      mensual: 300
    };

    const monto = precios[tipo] || 300;
    document.getElementById(elementId).value = monto;
  }

  calcularFechaVencimiento() {
    const tipoMembresia = document.getElementById("pagoTipoMembresia").value;
    const fechaInicioInput = document.getElementById("pagoFechaInicio").value;

    const dias = {
      diaria: 1,
      semanal: 7,
      mensual: 30
    };

    const precios = {
      diaria: 30,
      semanal: 150,
      mensual: 300
    };

    const fechaInicio = fechaInicioInput ? new Date(fechaInicioInput) : new Date();
    const diasSumar = dias[tipoMembresia] || 30;

    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + diasSumar);

    document.getElementById("pagoFechaFin").textContent = fechaFin.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    document.getElementById("pagoMontoCalculado").textContent = (precios[tipoMembresia] || 300).toFixed(2);
  }

  async guardarSocio() {
    const form = document.getElementById("formSocio");
    const formData = new FormData(form);

    if (!formData.get("nombre") || !formData.get("celular") || !formData.get("fecha_ingreso")) {
      this.mostrarError("Por favor completa todos los campos obligatorios");
      return;
    }

    const socioData = {
      nombre: formData.get("nombre"),
      celular: formData.get("celular"),
      tipo_turno: formData.get("tipo_turno"),
      instituto: formData.get("es_estudiante") ? formData.get("instituto") : null,
      fecha_ingreso: formData.get("fecha_ingreso"),
      mes_inscripcion: this.getMesNombre(new Date(formData.get("fecha_ingreso")).getMonth())
    };

    try {
      let result;

      if (this.modoEdicion && this.socioActual) {
        // Actualizar socio existente
        socioData.id_socio = this.socioActual.id_socio;
        result = await ipcRenderer.invoke("actualizar-socio", socioData);
      } else {
        // Registrar nuevo socio (con pago inicial)
        if (!formData.get("tipo_membresia")) {
          this.mostrarError("Selecciona el tipo de membresía");
          return;
        }
        socioData.tipo_membresia = formData.get("tipo_membresia");
        socioData.monto_pago = parseFloat(formData.get("monto_pago"));
        result = await ipcRenderer.invoke("registrar-socio", socioData);
      }

      if (result.success) {
        this.mostrarExito(this.modoEdicion ? "Socio actualizado correctamente" : "Socio registrado correctamente");
        this.cerrarModalSocio();
        await this.loadSocios();
        await this.loadEstadisticas();
      } else {
        this.mostrarError(result.message || "Error al guardar socio");
      }
    } catch (error) {
      console.error("Error al guardar socio:", error);
      this.mostrarError("Error al guardar socio");
    }
  }

  async confirmarPago() {
    const form = document.getElementById("formPago");
    const formData = new FormData(form);

    const idSocio = parseInt(formData.get("id_socio"));
    const tipoMembresia = formData.get("tipo_membresia");
    const fechaInicioInput = formData.get("fecha_inicio");
    const metodoPago = formData.get("metodo_pago");
    const observaciones = formData.get("observaciones");

    if (!tipoMembresia || !metodoPago) {
      this.mostrarError("Por favor completa los campos requeridos");
      return;
    }

    const precios = {
      diaria: 30,
      semanal: 150,
      mensual: 300
    };

    const pagoData = {
      id_socio: idSocio,
      tipo_membresia: tipoMembresia,
      monto: precios[tipoMembresia],
      fecha_inicio: fechaInicioInput || new Date().toISOString().split('T')[0],
      metodo_pago: metodoPago,
      observaciones: observaciones
    };

    try {
      const result = await ipcRenderer.invoke("registrar-pago", pagoData);

      if (result.success) {
        this.mostrarExito("Pago registrado correctamente");
        this.cerrarModalPago();
        await this.loadSocios();
        await this.loadEstadisticas();
      } else {
        this.mostrarError(result.message || "Error al registrar pago");
      }
    } catch (error) {
      console.error("Error al confirmar pago:", error);
      this.mostrarError("Error al registrar pago");
    }
  }

  async eliminarSocio(idSocio) {
    const confirmado = await ipcRenderer.invoke("show-confirmation", {
      title: "Eliminar Socio",
      message: "¿Estás seguro de que deseas eliminar este socio? Esta acción no se puede deshacer."
    });

    if (!confirmado) return;

    try {
      const result = await ipcRenderer.invoke("eliminar-socio", idSocio);

      if (result.success) {
        this.mostrarExito("Socio eliminado correctamente");
        await this.loadSocios();
        await this.loadEstadisticas();
      } else {
        this.mostrarError(result.message || "Error al eliminar socio");
      }
    } catch (error) {
      console.error("Error al eliminar socio:", error);
      this.mostrarError("Error al eliminar socio");
    }
  }

  async buscarSocios(query) {
    if (!query.trim()) {
      this.renderTabla(this.socios);
      return;
    }

    try {
      const result = await ipcRenderer.invoke("buscar-socios", query);

      if (result.success) {
        this.renderTabla(result.socios);
      }
    } catch (error) {
      console.error("Error buscando socios:", error);
    }
  }

  filtrarPorEstado(estado) {
    if (!estado) {
      this.renderTabla(this.socios);
      return;
    }

    let sociosFiltrados = [];

    switch (estado) {
      case 'activo':
        sociosFiltrados = this.socios.filter(s => s.dias_restantes > 1);
        break;
      case 'vencido':
        sociosFiltrados = this.socios.filter(s => s.dias_restantes < 0 || !s.fecha_vencimiento);
        break;
      case 'proximo-vencer':
        sociosFiltrados = this.socios.filter(s => s.dias_restantes >= 0 && s.dias_restantes <= 1);
        break;
    }

    this.renderTabla(sociosFiltrados);
  }

  getMesNombre(mes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes];
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
    alert("Error: " + mensaje);
  }

  mostrarExito(mensaje) {
    alert(mensaje);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new SociosManager();
});


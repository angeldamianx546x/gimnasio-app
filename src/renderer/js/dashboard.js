// src/renderer/js/dashboard.js
const { ipcRenderer } = require("electron");

class DashboardManager {
  constructor() {
    this.currentUser = null;
    this.stats = {
      ventasHoy: 0,
      clientesActivos: 0,
      productosStock: 0,
      accesosHoy: 0,
    };
    this.periodoHistorial = 'hoy'; // 'hoy', 'semana', 'mes'
    this.init();
  }

  async init() {
    await this.loadUserData();
    this.bindEvents();
    this.updateUserInterface();
    await this.loadRealStats();
    await this.loadRecentActivity();
  }

  async loadUserData() {
    try {
      this.currentUser = await ipcRenderer.invoke("get-current-user");
      console.log("Usuario actual:", this.currentUser);
    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
    }
  }

  bindEvents() {
    // Navegación del sidebar
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const page = item.getAttribute("data-page");
        this.navigateToPage(page);
      });
    });

    // Acciones rápidas
    const actionBtns = document.querySelectorAll(".action-btn");
    actionBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = btn.getAttribute("data-action");
        this.handleQuickAction(action);
      });
    });

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        this.handleLogout();
      });
    }

    // Filtros de historial
    this.bindHistorialFilters();

    // Refrescar stats cada 30 segundos
    setInterval(() => {
      this.loadRealStats();
      this.loadRecentActivity();
    }, 30000);
  }

  bindHistorialFilters() {
    // Agregar botones de filtro si no existen
    const activityHeader = document.querySelector('.recent-activity h2');
    if (activityHeader && !document.getElementById('filterButtons')) {
      const filterDiv = document.createElement('div');
      filterDiv.id = 'filterButtons';
      filterDiv.style.cssText = 'display: flex; gap: 0.5rem; margin-left: auto;';
      filterDiv.innerHTML = `
        <button class="filter-btn active" data-periodo="hoy">Hoy</button>
        <button class="filter-btn" data-periodo="semana">Semana</button>
        <button class="filter-btn" data-periodo="mes">Mes</button>
      `;
      
      activityHeader.parentElement.style.display = 'flex';
      activityHeader.parentElement.style.justifyContent = 'space-between';
      activityHeader.parentElement.style.alignItems = 'center';
      activityHeader.parentElement.appendChild(filterDiv);

      // Event listeners para los filtros
      filterDiv.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          // Actualizar botón activo
          filterDiv.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // Cambiar periodo y recargar
          this.periodoHistorial = btn.dataset.periodo;
          await this.loadRecentActivity();
        });
      });
    }
  }

  updateUserInterface() {
    // Mostrar información del usuario
    const userInfo = document.getElementById("userInfo");
    if (userInfo && this.currentUser) {
      userInfo.textContent = `${this.currentUser.nombre} (${this.currentUser.tipo})`;
    }

    // Ocultar opciones de jefe si es empleado
    if (this.currentUser && this.currentUser.tipo === "empleado") {
      this.hideAdminFeatures();
    }

    // Actualizar fecha/hora
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
  }

  hideAdminFeatures() {
    // Ocultar navegación a productos para empleados
    const productosNav = document.getElementById("productosNav");
    if (productosNav) {
      productosNav.style.display = "none";
    }

    // Ocultar botón de inventario
    const inventarioBtn = document.getElementById("inventarioBtn");
    if (inventarioBtn) {
      inventarioBtn.style.display = "none";
    }
  }

  async loadRealStats() {
    // Mostrar estado de carga
    this.showStatsLoading();

    try {
      // Obtener estadísticas reales de la base de datos
      const [ventasResult, sociosResult, productosResult, accesosResult] = await Promise.all([
        ipcRenderer.invoke("get-ventas-hoy"),
        ipcRenderer.invoke("get-estadisticas-socios"),
        ipcRenderer.invoke("get-productos"),
        ipcRenderer.invoke("get-accesos-hoy")
      ]);

      // Ventas del día
      const ventasHoy = ventasResult.success ? ventasResult.total : 0;

      // Socios activos
      const sociosActivos = sociosResult.success ? sociosResult.estadisticas.activos : 0;

      // Productos en stock (productos con stock > 0)
      const productosStock = productosResult.success 
        ? productosResult.productos.filter(p => p.stock > 0).length 
        : 0;

      // Accesos del día
      const accesosHoy = accesosResult.success ? accesosResult.total : 0;

      this.stats = {
        ventasHoy: `$${ventasHoy.toFixed(2)}`,
        clientesActivos: sociosActivos,
        productosStock: productosStock,
        accesosHoy: accesosHoy,
      };

      this.updateStatsDisplay();
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
      this.showStatsError();
    }
  }

  showStatsLoading() {
    const statNumbers = document.querySelectorAll(".stat-number");
    statNumbers.forEach((stat) => {
      stat.classList.add("loading");
      stat.textContent = "...";
    });
  }

  updateStatsDisplay() {
    // Actualizar cada estadística con animación
    this.updateStatWithAnimation("ventasHoy", this.stats.ventasHoy);
    this.updateStatWithAnimation("clientesActivos", this.stats.clientesActivos);
    this.updateStatWithAnimation("productosStock", this.stats.productosStock);
    this.updateStatWithAnimation("accesosHoy", this.stats.accesosHoy);
  }

  updateStatWithAnimation(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.remove("loading");

    // Si es un valor monetario, mostrarlo directamente
    if (typeof value === "string" && value.startsWith("$")) {
      element.textContent = value;
      return;
    }

    // Animación de conteo para números
    let startValue = 0;
    const endValue = typeof value === "string" 
      ? parseInt(value.replace(/[^\d]/g, "")) 
      : value;
    const duration = 1000;
    const increment = endValue / (duration / 16);

    const animate = () => {
      startValue += increment;
      if (startValue < endValue) {
        element.textContent = Math.floor(startValue).toLocaleString();
        requestAnimationFrame(animate);
      } else {
        element.textContent = endValue.toLocaleString();
      }
    };

    animate();
  }

  async loadRecentActivity() {
    const activityList = document.getElementById("activityList");
    if (!activityList) return;

    try {
      // Mostrar estado de carga
      activityList.innerHTML = '<p class="loading">Cargando actividad...</p>';

      // Obtener historial real de la base de datos
      const result = await ipcRenderer.invoke("get-historial-actividades", this.periodoHistorial);

      if (result.success && result.actividades.length > 0) {
        this.renderActivityList(result.actividades);
      } else {
        activityList.innerHTML = `
          <p class="no-activity">
            No hay actividad registrada ${this.getPeriodoTexto()}
          </p>
        `;
      }
    } catch (error) {
      console.error("Error cargando actividad:", error);
      activityList.innerHTML = '<p class="no-activity">Error al cargar actividad</p>';
    }
  }

  getPeriodoTexto() {
    switch(this.periodoHistorial) {
      case 'hoy': return 'hoy';
      case 'semana': return 'en esta semana';
      case 'mes': return 'en este mes';
      default: return '';
    }
  }

  renderActivityList(actividades) {
    const activityList = document.getElementById("activityList");

    if (actividades.length === 0) {
      activityList.innerHTML = '<p class="no-activity">No hay actividad reciente</p>';
      return;
    }

    const html = actividades
      .map((activity) => {
        const fecha = new Date(activity.fecha);
        const timeAgo = this.getTimeAgo(fecha);
        const icon = this.getActivityIcon(activity.accion);

        return `
          <div class="activity-item">
            <div class="activity-icon">${icon}</div>
            <div class="activity-info">
              <div class="activity-title">${activity.accion}</div>
              <div class="activity-description">${activity.descripcion}</div>
              <div class="activity-user">Por: ${activity.usuario || 'Sistema'}</div>
            </div>
            <div class="activity-time">${timeAgo}</div>
          </div>
        `;
      })
      .join("");

    activityList.innerHTML = html;
  }

  getActivityIcon(accion) {
    const iconMap = {
      'Inicio de sesión': '🔐',
      'Cierre de sesión': '🚪',
      'Realizar venta': '💰',
      'Agregar producto': '📦',
      'Actualizar stock': '📊',
      'Registrar socio': '👤',
      'Registrar pago': '💳',
      'Registrar asistencia': '✅',
    };
    
    return iconMap[accion] || '📝';
  }

  getTimeAgo(fecha) {
    const ahora = new Date();
    const diff = ahora - fecha;
    
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Justo ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    
    return fecha.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async handleQuickAction(action) {
    console.log("Acción rápida:", action);

    switch (action) {
      case "nueva-venta":
        await this.navigateToPage("ventas");
        break;
      case "nuevo-socio":
        await this.navigateToPage("socios");
        break;
      case "verificar-acceso":
        await this.navigateToPage("acceso");
        break;
      case "inventario":
          await this.navigateToPage("productos");
        break;
      default:
        console.log("Acción no implementada:", action);
    }
  }

  async navigateToPage(page) {
    try {
      await ipcRenderer.invoke("navigate-to", page);
    } catch (error) {
      console.error("Error navegando a:", page, error);
    }
  }

  async handleLogout() {
    const confirmed = await ipcRenderer.invoke("show-confirmation", {
      title: "Cerrar Sesión",
      message: "¿Estás seguro de que quieres cerrar sesión?",
    });

    if (confirmed) {
      try {
        // Limpiar datos locales
        this.currentUser = null;

        // Llamar al logout en el proceso principal
        await ipcRenderer.invoke("logout");

        console.log("Logout exitoso");
      } catch (error) {
        console.error("Error durante logout:", error);
        // Intentar navegar directamente si falla el logout
        await ipcRenderer.invoke("navigate-to", "login");
      }
    }
  }

  updateDateTime() {
    const now = new Date();
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    // Aquí podrías agregar un elemento de fecha/hora si lo deseas
    // const dateTimeElement = document.getElementById('currentDateTime');
    // if (dateTimeElement) {
    //     dateTimeElement.textContent = now.toLocaleDateString('es-ES', options);
    // }
  }

  showStatsError() {
    const statNumbers = document.querySelectorAll(".stat-number");
    statNumbers.forEach((stat) => {
      stat.classList.remove("loading");
      stat.textContent = "Error";
      stat.style.color = "var(--error-color)";
    });
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new DashboardManager();
});

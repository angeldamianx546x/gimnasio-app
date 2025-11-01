// Sistema de dashboard
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
    this.init();
  }

  async init() {
    await this.loadUserData();
    this.bindEvents();
    this.updateUserInterface();
    this.loadStats();
    this.loadRecentActivity();
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

    // Refrescar stats cada 30 segundos
    setInterval(() => {
      this.loadStats();
    }, 30000);
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

  async loadStats() {
    // Mostrar estado de carga
    this.showStatsLoading();

    try {
      // Simular carga de estadísticas
      // En el futuro, estas vendrán de la base de datos
      await this.delay(800);

      this.stats = {
        ventasHoy: this.generateRandomStat(500, 2000, "$"),
        clientesActivos: this.generateRandomStat(50, 200),
        productosStock: this.generateRandomStat(20, 100),
        accesosHoy: this.generateRandomStat(30, 150),
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

    // Animación de conteo
    let startValue = 0;
    const endValue =
      typeof value === "string" ? parseInt(value.replace(/[^\d]/g, "")) : value;
    const prefix = typeof value === "string" && value.includes("$") ? "$" : "";
    const duration = 1000;
    const increment = endValue / (duration / 16);

    const animate = () => {
      startValue += increment;
      if (startValue < endValue) {
        element.textContent = prefix + Math.floor(startValue).toLocaleString();
        requestAnimationFrame(animate);
      } else {
        element.textContent = prefix + endValue.toLocaleString();
      }
    };

    animate();
  }

  generateRandomStat(min, max, prefix = "") {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return prefix + value.toLocaleString();
  }

  async loadRecentActivity() {
    const activityList = document.getElementById("activityList");
    if (!activityList) return;

    try {
      // Simular actividad reciente
      const activities = [
        {
          title: "Venta registrada",
          description: "Proteína Whey - $450",
          time: "2 min ago",
        },
        {
          title: "Cliente registrado",
          description: "Ana López - Suscripción mensual",
          time: "15 min ago",
        },
        {
          title: "Acceso autorizado",
          description: "Carlos Ruiz - Entrada al gimnasio",
          time: "23 min ago",
        },
        {
          title: "Inventario actualizado",
          description: "Creatina - Stock repuesto",
          time: "1 hora ago",
        },
      ];

      this.renderActivityList(activities);
    } catch (error) {
      console.error("Error cargando actividad:", error);
    }
  }

  renderActivityList(activities) {
    const activityList = document.getElementById("activityList");

    if (activities.length === 0) {
      activityList.innerHTML =
        '<p class="no-activity">No hay actividad reciente</p>';
      return;
    }

    const html = activities
      .map(
        (activity) => `
            <div class="activity-item">
                <div class="activity-info">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `
      )
      .join("");

    activityList.innerHTML = html;
  }

  async handleQuickAction(action) {
    console.log("Acción rápida:", action);

    switch (action) {
      case "nueva-venta":
        await this.navigateToPage("ventas");
        break;
      case "nuevo-cliente":
        await this.navigateToPage("clientes");
        break;
      case "verificar-acceso":
        await this.navigateToPage("acceso");
        break;
      case "inventario":
        if (this.currentUser.tipo === "jefe") {
          await this.navigateToPage("productos");
        } else {
          await ipcRenderer.invoke(
            "show-error",
            "No tienes permisos para acceder al inventario"
          );
        }
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

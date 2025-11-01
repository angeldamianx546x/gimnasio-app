const { ipcRenderer } = require("electron");

class VentasManager {
  constructor() {
    this.currentUser = null;
    this.carrito = [];
    this.productos = [];
    this.init();
  }

  async init() {
    await this.loadUserData();
    this.bindEvents();
    this.updateUserInterface();
    this.loadProductos();
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

    // Búsqueda de productos
    const searchInput = document.getElementById("searchProductos");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterProductos(e.target.value);
      });
    }

    // Botones del carrito
    const limpiarBtn = document.getElementById("limpiarCarrito");
    const procesarBtn = document.getElementById("procesarVenta");

    if (limpiarBtn) {
      limpiarBtn.addEventListener("click", () => this.limpiarCarrito());
    }

    if (procesarBtn) {
      procesarBtn.addEventListener("click", () =>
        this.abrirModalConfirmacion()
      );
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
    // Mostrar información del usuario
    const userInfo = document.getElementById("userInfo");
    const vendedorNombre = document.getElementById("vendedorNombre");
    const fechaVenta = document.getElementById("fechaVenta");

    if (userInfo && this.currentUser) {
      userInfo.textContent = `${this.currentUser.nombre} (${this.currentUser.tipo})`;
    }

    if (vendedorNombre && this.currentUser) {
      vendedorNombre.textContent = this.currentUser.nombre;
    }

    if (fechaVenta) {
      fechaVenta.textContent = new Date().toLocaleDateString("es-ES");
    }

    // Ocultar productos si es empleado
    if (this.currentUser && this.currentUser.tipo === "empleado") {
      const productosNav = document.getElementById("productosNav");
      if (productosNav) {
        productosNav.style.display = "none";
      }
    }
  }

  async loadProductos() {
    // Productos simulados por ahora
    this.productos = [
      { id: 1, nombre: "Proteína Whey", precio: 450, stock: 25 },
      { id: 2, nombre: "Creatina", precio: 280, stock: 15 },
      { id: 3, nombre: "BCAA", precio: 320, stock: 30 },
      { id: 4, nombre: "Pre-workout", precio: 380, stock: 8 },
      { id: 5, nombre: "Glutamina", precio: 220, stock: 20 },
    ];

    this.renderProductos();
  }

  renderProductos(productosToShow = this.productos) {
    const container = document.getElementById("productosDisponibles");
    if (!container) return;

    if (productosToShow.length === 0) {
      container.innerHTML =
        '<p class="loading">No se encontraron productos</p>';
      return;
    }

    const html = productosToShow
      .map(
        (producto) => `
            <div class="producto-item" data-id="${producto.id}">
                <div class="producto-info">
                    <h4>${producto.nombre}</h4>
                    <p class="producto-precio">$${producto.precio}</p>
                    <p class="producto-stock ${
                      producto.stock < 10 ? "low" : ""
                    } ${producto.stock === 0 ? "out" : ""}">
                        Stock: ${producto.stock}
                    </p>
                </div>
                <button class="btn btn-primary" onclick="ventasManager.agregarAlCarrito(${
                  producto.id
                })" 
                        ${producto.stock === 0 ? "disabled" : ""}>
                    Agregar
                </button>
            </div>
        `
      )
      .join("");

    container.innerHTML = html;
  }

  filterProductos(query) {
    const filtered = this.productos.filter((producto) =>
      producto.nombre.toLowerCase().includes(query.toLowerCase())
    );
    this.renderProductos(filtered);
  }

  agregarAlCarrito(productoId) {
    const producto = this.productos.find((p) => p.id === productoId);
    if (!producto || producto.stock === 0) return;

    const itemExistente = this.carrito.find((item) => item.id === productoId);

    if (itemExistente) {
      if (itemExistente.cantidad < producto.stock) {
        itemExistente.cantidad++;
      }
    } else {
      this.carrito.push({
        ...producto,
        cantidad: 1,
      });
    }

    this.updateCarrito();
  }

  updateCarrito() {
    this.renderCarrito();
    this.updateTotales();
    this.toggleProcesarButton();
  }

  renderCarrito() {
    const container = document.getElementById("carritoItems");
    if (!container) return;

    if (this.carrito.length === 0) {
      container.innerHTML =
        '<p class="carrito-vacio">El carrito está vacío</p>';
      return;
    }

    const html = this.carrito
      .map(
        (item) => `
            <div class="carrito-item">
                <div class="item-info">
                    <h5>${item.nombre}</h5>
                    <p class="item-precio">$${item.precio} c/u</p>
                </div>
                <div class="item-controls">
                    <button class="quantity-btn" onclick="ventasManager.cambiarCantidad(${item.id}, -1)">-</button>
                    <input type="number" class="quantity-input" value="${item.cantidad}" min="1" max="${item.stock}"
                           onchange="ventasManager.setCantidad(${item.id}, this.value)">
                    <button class="quantity-btn" onclick="ventasManager.cambiarCantidad(${item.id}, 1)">+</button>
                    <button class="remove-btn" onclick="ventasManager.removerDelCarrito(${item.id})">×</button>
                </div>
            </div>
        `
      )
      .join("");

    container.innerHTML = html;
  }

  cambiarCantidad(productoId, cambio) {
    const item = this.carrito.find((item) => item.id === productoId);
    if (!item) return;

    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad > 0 && nuevaCantidad <= item.stock) {
      item.cantidad = nuevaCantidad;
      this.updateCarrito();
    }
  }

  setCantidad(productoId, cantidad) {
    const item = this.carrito.find((item) => item.id === productoId);
    if (!item) return;

    const nuevaCantidad = parseInt(cantidad);
    if (nuevaCantidad > 0 && nuevaCantidad <= item.stock) {
      item.cantidad = nuevaCantidad;
      this.updateCarrito();
    }
  }

  removerDelCarrito(productoId) {
    this.carrito = this.carrito.filter((item) => item.id !== productoId);
    this.updateCarrito();
  }

  limpiarCarrito() {
    this.carrito = [];
    this.updateCarrito();
  }

  updateTotales() {
    const subtotal = this.carrito.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );
    const total = subtotal; // Por ahora sin impuestos

    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");

    if (subtotalElement) {
      subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    }
    if (totalElement) {
      totalElement.textContent = `$${total.toFixed(2)}`;
    }
  }

  toggleProcesarButton() {
    const procesarBtn = document.getElementById("procesarVenta");
    if (procesarBtn) {
      procesarBtn.disabled = this.carrito.length === 0;
    }
  }

  abrirModalConfirmacion() {
    // Por ahora, confirmación simple
    const total = this.carrito.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );
    console.log("Procesar venta por:", total);
    alert(`Funcionalidad en desarrollo. Total: $${total.toFixed(2)}`);
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
        // Limpiar carrito y datos locales
        this.carrito = [];
        this.currentUser = null;

        // Llamar al logout en el proceso principal
        await ipcRenderer.invoke("logout");

        console.log("Logout exitoso desde ventas");
      } catch (error) {
        console.error("Error durante logout:", error);
        await ipcRenderer.invoke("navigate-to", "login");
      }
    }
  }
}

// Variable global para acceso desde el HTML
let ventasManager;

document.addEventListener("DOMContentLoaded", () => {
  ventasManager = new VentasManager();
});

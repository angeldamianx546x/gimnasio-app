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
    await this.loadProductos();
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
      procesarBtn.addEventListener("click", () => this.procesarVenta());
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
    const container = document.getElementById("productosDisponibles");
    if (!container) return;

    container.innerHTML = '<p class="loading">Cargando productos...</p>';

    try {
      const result = await ipcRenderer.invoke("get-productos");

      if (result.success) {
        this.productos = result.productos.filter(p => p.stock > 0);
        this.renderProductos();
      } else {
        container.innerHTML = '<p class="loading">Error al cargar productos</p>';
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
      container.innerHTML = '<p class="loading">Error al cargar productos</p>';
    }
  }

  renderProductos(productosToShow = this.productos) {
    const container = document.getElementById("productosDisponibles");
    if (!container) return;

    if (productosToShow.length === 0) {
      container.innerHTML =
        '<p class="loading">No hay productos disponibles con stock</p>';
      return;
    }

    const html = productosToShow
      .map(
        (producto) => `
            <div class="producto-item" onclick="ventasManager.agregarAlCarrito(${producto.id_producto})">
                <div class="producto-info">
                    <h4>${producto.nombre}</h4>
                    <p class="producto-precio">$${parseFloat(producto.precio).toFixed(2)}</p>
                    <p class="producto-stock ${producto.stock < 10 ? "low" : ""}">
                        Stock: ${producto.stock}
                    </p>
                </div>
                <button class="btn btn-primary" onclick="event.stopPropagation(); ventasManager.agregarAlCarrito(${producto.id_producto})">
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
    const producto = this.productos.find((p) => p.id_producto === productoId);
    if (!producto || producto.stock === 0) {
      this.mostrarError("Producto sin stock disponible");
      return;
    }

    const itemExistente = this.carrito.find((item) => item.id === productoId);

    if (itemExistente) {
      // Verificar que no se exceda el stock disponible
      if (itemExistente.cantidad < producto.stock) {
        itemExistente.cantidad++;
      } else {
        this.mostrarError(`Stock máximo disponible: ${producto.stock}`);
        return;
      }
    } else {
      this.carrito.push({
        id: producto.id_producto,
        nombre: producto.nombre,
        precio: parseFloat(producto.precio),
        cantidad: 1,
        stock: producto.stock
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
                    <p class="item-precio">$${item.precio.toFixed(2)} c/u</p>
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
    
    if (nuevaCantidad <= 0) {
      this.removerDelCarrito(productoId);
      return;
    }
    
    if (nuevaCantidad > item.stock) {
      this.mostrarError(`Stock máximo disponible: ${item.stock}`);
      return;
    }
    
    item.cantidad = nuevaCantidad;
    this.updateCarrito();
  }

  setCantidad(productoId, cantidad) {
    const item = this.carrito.find((item) => item.id === productoId);
    if (!item) return;

    const nuevaCantidad = parseInt(cantidad);
    
    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
      this.removerDelCarrito(productoId);
      return;
    }
    
    if (nuevaCantidad > item.stock) {
      this.mostrarError(`Stock máximo disponible: ${item.stock}`);
      return;
    }
    
    item.cantidad = nuevaCantidad;
    this.updateCarrito();
  }

  removerDelCarrito(productoId) {
    this.carrito = this.carrito.filter((item) => item.id !== productoId);
    this.updateCarrito();
  }

  limpiarCarrito() {
    if (this.carrito.length === 0) return;

    if (confirm("¿Estás seguro de que deseas limpiar el carrito?")) {
      this.carrito = [];
      this.updateCarrito();
    }
  }

  updateTotales() {
    const subtotal = this.carrito.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );
    const total = subtotal;

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

  async procesarVenta() {
    if (this.carrito.length === 0) {
      this.mostrarError("El carrito está vacío");
      return;
    }

    const total = this.carrito.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );

    const confirmado = await ipcRenderer.invoke("show-confirmation", {
      title: "Confirmar Venta",
      message: `¿Confirmar venta por un total de $${total.toFixed(2)}?\n\nProductos: ${this.carrito.length}\nTotal: $${total.toFixed(2)}`
    });

    if (!confirmado) return;

    // Deshabilitar botón mientras se procesa
    const procesarBtn = document.getElementById("procesarVenta");
    if (procesarBtn) {
      procesarBtn.disabled = true;
      procesarBtn.textContent = "Procesando...";
    }

    try {
      const ventaData = {
        carrito: this.carrito,
        total: total
      };

      const result = await ipcRenderer.invoke("procesar-venta", ventaData);

      if (result.success) {
        await ipcRenderer.invoke("show-info", {
          title: "Venta Exitosa",
          message: `Venta procesada correctamente\n\nTicket #${result.id_venta}\nTotal: $${result.total.toFixed(2)}`
        });

        // Limpiar carrito y recargar productos
        this.carrito = [];
        this.updateCarrito();
        await this.loadProductos();
      } else {
        this.mostrarError(result.message || "Error al procesar la venta");
      }
    } catch (error) {
      console.error("Error procesando venta:", error);
      this.mostrarError("Error al procesar la venta");
    } finally {
      // Restaurar botón
      if (procesarBtn) {
        procesarBtn.disabled = false;
        procesarBtn.textContent = "Procesar Venta";
      }
    }
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
        this.carrito = [];
        this.currentUser = null;
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

// Variable global para acceso desde el HTML
let ventasManager;

document.addEventListener("DOMContentLoaded", () => {
  ventasManager = new VentasManager();
});
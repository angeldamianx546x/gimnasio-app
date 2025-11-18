const { ipcRenderer } = require("electron");

class ProductosManager {
  constructor() {
    this.currentUser = null;
    this.productos = [];
    this.productoActual = null;
    this.modoEdicion = false;
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

    // Botón Nuevo Producto
    const btnNuevoProducto = document.getElementById("btnNuevoProducto");
    if (btnNuevoProducto) {
      btnNuevoProducto.addEventListener("click", () => this.abrirModalNuevo());
    }

    // Búsqueda
    const searchProductos = document.getElementById("searchProductos");
    if (searchProductos) {
      searchProductos.addEventListener("input", (e) => {
        this.buscarProductos(e.target.value);
      });
    }

    // Botón Recargar
    const btnRecargar = document.getElementById("btnRecargar");
    if (btnRecargar) {
      btnRecargar.addEventListener("click", () => this.loadProductos());
    }

    // Modal Producto - Eventos
    const btnCerrarModal = document.getElementById("btnCerrarModal");
    const btnCancelar = document.getElementById("btnCancelar");
    const btnGuardar = document.getElementById("btnGuardar");

    if (btnCerrarModal) {
      btnCerrarModal.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModal();
      });
    }
    if (btnCancelar) {
      btnCancelar.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModal();
      });
    }
    if (btnGuardar) {
      btnGuardar.addEventListener("click", (e) => {
        e.preventDefault();
        this.guardarProducto();
      });
    }

    // Modal Stock - Eventos
    const btnCerrarModalStock = document.getElementById("btnCerrarModalStock");
    const btnCancelarStock = document.getElementById("btnCancelarStock");
    const btnGuardarStock = document.getElementById("btnGuardarStock");

    if (btnCerrarModalStock) {
      btnCerrarModalStock.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModalStock();
      });
    }
    if (btnCancelarStock) {
      btnCancelarStock.addEventListener("click", (e) => {
        e.preventDefault();
        this.cerrarModalStock();
      });
    }
    if (btnGuardarStock) {
      btnGuardarStock.addEventListener("click", (e) => {
        e.preventDefault();
        this.guardarStock();
      });
    }

    // Evento global para tecla ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.cerrarModal();
        this.cerrarModalStock();
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
  }

  async loadProductos() {
    try {
      this.mostrarEstadoCarga();

      const result = await ipcRenderer.invoke("get-productos");

      if (result.success) {
        this.productos = result.productos;
        this.renderTabla(this.productos);
        this.actualizarEstadisticas();
      } else {
        this.mostrarError("Error al cargar productos");
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
      this.mostrarError("Error al cargar productos");
    }
  }

  mostrarEstadoCarga() {
    const tbody = document.getElementById("productosTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--spacing-xl);">
            <div class="empty-state">
              <div class="empty-state-icon">⏳</div>
              <p>Cargando productos...</p>
            </div>
          </td>
        </tr>
      `;
    }
  }

  renderTabla(productos) {
    const tbody = document.getElementById("productosTableBody");
    if (!tbody) return;

    if (productos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--spacing-xl);">
            <div class="empty-state">
              <div class="empty-state-icon">📦</div>
              <p>No hay productos registrados</p>
              <button class="btn btn-primary" onclick="productosManager.abrirModalNuevo()">
                ➕ Agregar Primer Producto
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const html = productos.map((producto) => this.createTableRow(producto)).join("");
    tbody.innerHTML = html;

    this.bindActionButtons();
  }

  createTableRow(producto) {
    const stockClass = producto.stock <= 5 ? 'stock-bajo' :
      producto.stock <= 10 ? 'stock-medio' : 'stock-alto';

    const stockBadge = producto.stock === 0 ?
      '<span class="estado-badge vencido">Sin Stock</span>' :
      producto.stock <= 5 ?
        '<span class="estado-badge proximo-vencer">Stock Bajo</span>' :
        '<span class="estado-badge activo">Disponible</span>';

    return `
      <tr class="${stockClass}" data-id="${producto.id_producto}">
        <td><strong>${producto.id_producto.toString().padStart(4, '0')}</strong></td>
        <td><strong>${producto.nombre}</strong></td>
        <td class="precio-cell">$${parseFloat(producto.precio).toFixed(2)}</td>
        <td>
          <div class="stock-control">
            <button class="stock-btn" data-action="decrease" data-id="${producto.id_producto}" 
                    ${producto.stock === 0 ? 'disabled' : ''}>-</button>
            <span class="stock-cantidad">${producto.stock}</span>
            <button class="stock-btn" data-action="increase" data-id="${producto.id_producto}">+</button>
          </div>
        </td>
        <td>${stockBadge}</td>
        <td>
          <div class="acciones-cell">
            <button class="btn btn-primary btn-icon btn-editar" 
                    data-id="${producto.id_producto}" 
                    title="Editar">
              ✏️
            </button>
            <button class="btn btn-warning btn-icon btn-stock" 
                    data-id="${producto.id_producto}" 
                    title="Ajustar Stock">
              📊
            </button>
            <button class="btn btn-error btn-icon btn-eliminar" 
                    data-id="${producto.id_producto}" 
                    title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  bindActionButtons() {
    // Botones de stock rápido
    document.querySelectorAll(".stock-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const idProducto = parseInt(btn.dataset.id);
        const action = btn.dataset.action;
        const cambio = action === "increase" ? 1 : -1;
        this.ajustarStock(idProducto, cambio);
      });
    });

    // Botones de editar
    document.querySelectorAll(".btn-editar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const idProducto = parseInt(btn.dataset.id);
        const producto = this.productos.find((p) => p.id_producto === idProducto);
        if (producto) {
          this.editarProducto(producto);
        }
      });
    });

    // Botones de stock
    document.querySelectorAll(".btn-stock").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const idProducto = parseInt(btn.dataset.id);
        const producto = this.productos.find((p) => p.id_producto === idProducto);
        if (producto) {
          this.abrirModalStock(producto);
        }
      });
    });

    // Botones de eliminar
    document.querySelectorAll(".btn-eliminar").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const idProducto = parseInt(btn.dataset.id);
        await this.eliminarProducto(idProducto);
      });
    });
  }

  abrirModalNuevo() {
    this.productoActual = null;
    this.modoEdicion = false;

    const form = document.getElementById("formProducto");
    if (form) {
      form.reset();
      
      // Habilitar todos los inputs explícitamente
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.disabled = false;
        input.readOnly = false;
      });
    }

    document.getElementById("modalProductoTitle").textContent = "Nuevo Producto";
    
    const modal = document.getElementById("modalProducto");
    modal.classList.add("active");
    
    // Focus en el primer input después de un pequeño delay
    setTimeout(() => {
      const primerInput = form.querySelector('input[name="nombre"]');
      if (primerInput) primerInput.focus();
    }, 100);
  }

  editarProducto(producto) {
    this.productoActual = producto;
    this.modoEdicion = true;

    const form = document.getElementById("formProducto");
    if (form) {
      // Habilitar todos los inputs explícitamente
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.disabled = false;
        input.readOnly = false;
      });

      // Llenar valores
      form.querySelector('[name="nombre"]').value = producto.nombre;
      form.querySelector('[name="precio"]').value = producto.precio;
      form.querySelector('[name="stock"]').value = producto.stock;
    }

    document.getElementById("modalProductoTitle").textContent = "Editar Producto";
    
    const modal = document.getElementById("modalProducto");
    modal.classList.add("active");
    
    // Focus en el primer input
    setTimeout(() => {
      const primerInput = form.querySelector('input[name="nombre"]');
      if (primerInput) {
        primerInput.focus();
        primerInput.select();
      }
    }, 100);
  }

  abrirModalStock(producto) {
    this.productoActual = producto;

    document.getElementById("stockProductoNombre").textContent = producto.nombre;
    document.getElementById("stockActual").textContent = producto.stock;
    
    const stockInput = document.getElementById("stockNuevoInput");
    stockInput.value = producto.stock;
    stockInput.disabled = false;
    stockInput.readOnly = false;

    this.actualizarDiferenciaStock();

    const modal = document.getElementById("modalStock");
    modal.classList.add("active");

    // Remover event listener anterior si existe
    const newStockInput = stockInput.cloneNode(true);
    stockInput.parentNode.replaceChild(newStockInput, stockInput);
    
    // Agregar nuevo event listener
    newStockInput.addEventListener("input", () => this.actualizarDiferenciaStock());
    
    // Focus en el input
    setTimeout(() => {
      newStockInput.focus();
      newStockInput.select();
    }, 100);
  }

  actualizarDiferenciaStock() {
    if (!this.productoActual) return;

    const stockInput = document.getElementById("stockNuevoInput");
    const diferenciaElement = document.getElementById("stockDiferencia");

    if (!stockInput || !diferenciaElement) return;

    const nuevoStock = parseInt(stockInput.value) || 0;
    const diferencia = nuevoStock - this.productoActual.stock;

    if (diferencia > 0) {
      diferenciaElement.textContent = `+${diferencia}`;
      diferenciaElement.style.color = 'var(--success-color)';
    } else if (diferencia < 0) {
      diferenciaElement.textContent = diferencia;
      diferenciaElement.style.color = 'var(--error-color)';
    } else {
      diferenciaElement.textContent = '0';
      diferenciaElement.style.color = 'var(--text-secondary)';
    }
  }

  cerrarModal() {
    const modal = document.getElementById("modalProducto");
    modal.classList.remove("active");
    
    // Limpiar el formulario
    const form = document.getElementById("formProducto");
    if (form) form.reset();
    
    this.productoActual = null;
    this.modoEdicion = false;
  }

  cerrarModalStock() {
    const modal = document.getElementById("modalStock");
    modal.classList.remove("active");
    
    this.productoActual = null;
  }

  async guardarProducto() {
    const form = document.getElementById("formProducto");
    const formData = new FormData(form);

    const nombre = formData.get("nombre")?.trim();
    const precio = parseFloat(formData.get("precio"));
    const stock = parseInt(formData.get("stock"));

    if (!nombre || precio <= 0 || stock < 0) {
      this.mostrarError("Por favor completa todos los campos correctamente");
      return;
    }

    const productoData = { nombre, precio, stock };

    try {
      let result;

      if (this.modoEdicion && this.productoActual) {
        productoData.id_producto = this.productoActual.id_producto;
        result = await ipcRenderer.invoke("actualizar-producto", productoData);
      } else {
        result = await ipcRenderer.invoke("add-producto", productoData);
      }

      if (result.success) {
        this.mostrarExito(
          this.modoEdicion
            ? "Producto actualizado correctamente"
            : "Producto agregado correctamente"
        );
        this.cerrarModal();
        await this.loadProductos();
      } else {
        this.mostrarError(result.message || "Error al guardar producto");
      }
    } catch (error) {
      console.error("Error al guardar producto:", error);
      this.mostrarError("Error al guardar producto");
    }
  }

  async guardarStock() {
    const nuevoStock = parseInt(document.getElementById("stockNuevoInput").value);

    if (isNaN(nuevoStock) || nuevoStock < 0) {
      this.mostrarError("El stock debe ser un número mayor o igual a 0");
      return;
    }

    try {
      const result = await ipcRenderer.invoke(
        "update-stock",
        this.productoActual.id_producto,
        nuevoStock
      );

      if (result.success) {
        this.mostrarExito("Stock actualizado correctamente");
        this.cerrarModalStock();
        await this.loadProductos();
      } else {
        this.mostrarError(result.message || "Error al actualizar stock");
      }
    } catch (error) {
      console.error("Error al actualizar stock:", error);
      this.mostrarError("Error al actualizar stock");
    }
  }

  async ajustarStock(idProducto, cambio) {
    const producto = this.productos.find((p) => p.id_producto === idProducto);
    if (!producto) return;

    const nuevoStock = producto.stock + cambio;
    if (nuevoStock < 0) return;

    try {
      const result = await ipcRenderer.invoke("update-stock", idProducto, nuevoStock);

      if (result.success) {
        await this.loadProductos();
      } else {
        this.mostrarError("Error al ajustar stock");
      }
    } catch (error) {
      console.error("Error al ajustar stock:", error);
    }
  }

  async eliminarProducto(idProducto) {
    const confirmado = await ipcRenderer.invoke("show-confirmation", {
      title: "Eliminar Producto",
      message: "¿Estás seguro de que deseas eliminar este producto?",
    });

    if (!confirmado) return;

    try {
      const result = await ipcRenderer.invoke("eliminar-producto", idProducto);

      if (result.success) {
        this.mostrarExito("Producto eliminado correctamente");
        await this.loadProductos();
      } else {
        this.mostrarError(result.message || "Error al eliminar producto");
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      this.mostrarError("Error al eliminar producto");
    }
  }

  async buscarProductos(query) {
    if (!query.trim()) {
      this.renderTabla(this.productos);
      return;
    }

    try {
      const result = await ipcRenderer.invoke("search-productos", query);

      if (result.success) {
        this.renderTabla(result.productos);
      }
    } catch (error) {
      console.error("Error buscando productos:", error);
    }
  }

  actualizarEstadisticas() {
    const totalProductos = this.productos.length;
    const stockBajo = this.productos.filter((p) => p.stock <= 5 && p.stock > 0).length;
    const sinStock = this.productos.filter((p) => p.stock === 0).length;
    const valorInventario = this.productos.reduce(
      (sum, p) => sum + p.precio * p.stock,
      0
    );

    document.getElementById("statTotalProductos").textContent = totalProductos;
    document.getElementById("statStockBajo").textContent = stockBajo;
    document.getElementById("statSinStock").textContent = sinStock;
    document.getElementById("statValorInventario").textContent = `$${valorInventario.toFixed(2)}`;
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

let productosManager;

document.addEventListener("DOMContentLoaded", () => {
  productosManager = new ProductosManager();
});
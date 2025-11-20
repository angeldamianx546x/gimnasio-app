// src/main.js
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

// Importar servicios de base de datos
const { initDatabase, closeDatabase } = require("../config/database");
const AuthService = require("./utils/auth");
const ProductosService = require("./utils/productos");
const SociosService = require("./utils/socios");

// Variables globales
let mainWindow;
let currentUser = null;
let isDbConnected = false;

// Función para crear la ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    show: false,
    titleBarStyle: "default",
  });

  mainWindow.loadFile(path.join(__dirname, "renderer/pages/login.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== "file://") {
      event.preventDefault();
    }
  });
}

// Función para crear el menú
function createMenu() {
  const template = [
    {
      label: "Archivo",
      submenu: [
        {
          label: "Cerrar Sesión",
          accelerator: "CmdOrCtrl+Q",
          click: () => logout(),
        },
        { type: "separator" },
        {
          label: "Salir",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Ver",
      submenu: [
        {
          label: "Recargar",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow.webContents.reload(),
        },
        {
          label: "Pantalla Completa",
          accelerator: "F11",
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
        { type: "separator" },
        {
          label: "Herramientas de Desarrollador",
          accelerator: "F12",
          click: () => mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: "Ayuda",
      submenu: [
        {
          label: "Acerca de",
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Acerca de Gimnasio App",
              message: "Sistema de Gestión para Gimnasio",
              detail: `Versión 1.0.0\nConectado a MySQL\nEstado BD: ${isDbConnected ? 'Conectado' : 'Desconectado'}`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Función para cerrar sesión
function logout() {
  if (currentUser) {
    AuthService.logoutUser(currentUser.id).catch(err => 
      console.error('Error al registrar logout:', err)
    );
  }
  
  currentUser = null;
  
  if (mainWindow) {
    mainWindow.webContents.session.clearStorageData();
    mainWindow.loadFile(path.join(__dirname, "renderer/pages/login.html"));
  }
  
  console.log("Sesión cerrada correctamente");
}

// Inicializar la aplicación
app.whenReady().then(async () => {
  try {
    // Inicializar base de datos
    await initDatabase();
    isDbConnected = true;
    console.log("Base de datos inicializada");
    
    // Crear usuario admin por defecto
    await AuthService.createDefaultAdmin();
    
    createWindow();
    createMenu();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    
    const { dialog } = require("electron");
    dialog.showErrorBox(
      "Error de Base de Datos",
      `No se pudo conectar con MySQL.\n\nAsegúrate de que:\n1. MySQL está ejecutándose en el puerto 3306\n2. La base de datos 'gimnasio' existe\n3. El usuario 'root' no tiene contraseña\n\nError: ${error.message}`
    );
    
    app.quit();
  }
});

// Salir cuando todas las ventanas estén cerradas
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Cerrar conexión de base de datos al salir
app.on("before-quit", async (event) => {
  if (isDbConnected) {
    event.preventDefault();
    await closeDatabase();
    app.exit();
  }
});

// ============================================================
// HANDLERS IPC - Autenticación
// ============================================================

ipcMain.handle("login-success", async (event, userData) => {
  try {
    const result = await AuthService.authenticateUser(
      userData.username, 
      userData.password
    );
    
    if (result.success) {
      currentUser = result.user;
      mainWindow.loadFile(path.join(__dirname, "renderer/pages/dashboard.html"));
    }
    
    return result;
  } catch (error) {
    console.error("Error en login:", error);
    return { success: false, message: "Error al autenticar" };
  }
});

ipcMain.handle("get-current-user", async () => {
  return currentUser;
});

ipcMain.handle("logout", async () => {
  logout();
  return { success: true };
});

// ============================================================
// HANDLERS IPC - Navegación
// ============================================================

ipcMain.handle("navigate-to", async (event, page) => {
  const validPages = ["dashboard", "ventas", "productos", "socios", "acceso"];

  if (validPages.includes(page)) {
    mainWindow.loadFile(path.join(__dirname, `renderer/pages/${page}.html`));
    return { success: true };
  }

  return { success: false, error: "Página no válida" };
});

// ============================================================
// HANDLERS IPC - Productos
// ============================================================

ipcMain.handle("get-productos", async () => {
  try {
    return await ProductosService.getAllProducts();
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return { success: false, message: "Error al cargar productos" };
  }
});

ipcMain.handle("add-producto", async (event, productData) => {
  try {
    if (!currentUser) {
      return { success: false, message: "No hay usuario autenticado" };
    }
    return await ProductosService.addProduct(productData, currentUser.id);
  } catch (error) {
    console.error("Error al agregar producto:", error);
    return { success: false, message: "Error al agregar producto" };
  }
});

 ipcMain.handle("update-stock", async (event, productId, newStock) => {
 try {
   if (!currentUser) {
     return { success: false, message: "No hay usuario autenticado" };
  }
   return await ProductosService.updateStock(productId, newStock, currentUser.id);
 } catch (error) {
   console.error("Error al actualizar stock:", error);
  return { success: false, message: "Error al actualizar stock" };
  }
});

// Agregar estos handlers en la sección de HANDLERS IPC - Productos

ipcMain.handle("actualizar-producto", async (event, productData) => {
  try {
    if (!currentUser) {
      return { success: false, message: "No hay usuario autenticado" };
    }
    return await ProductosService.updateProduct(productData, currentUser.id);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return { success: false, message: "Error al actualizar producto" };
  }
});

ipcMain.handle("eliminar-producto", async (event, productId) => {
  try {
    return await ProductosService.deleteProduct(productId);
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return { success: false, message: "Error al eliminar producto" };
  }
});

ipcMain.handle("get-low-stock-products", async () => {
  try {
    return await ProductosService.getLowStockProducts();
  } catch (error) {
    console.error("Error al obtener productos con stock bajo:", error);
    return { success: false, message: "Error al cargar productos" };
  }
});

ipcMain.handle("get-out-of-stock-products", async () => {
  try {
    return await ProductosService.getOutOfStockProducts();
  } catch (error) {
    console.error("Error al obtener productos sin stock:", error);
    return { success: false, message: "Error al cargar productos" };
  }
});

ipcMain.handle("search-productos", async (event, query) => {
  try {
    return await ProductosService.searchProducts(query);
  } catch (error) {
    console.error("Error al buscar productos:", error);
    return { success: false, message: "Error al buscar productos" };
  }
});

// ============================================================
// HANDLERS IPC - Socios
// ============================================================

ipcMain.handle("get-socios", async () => {
  try {
    return await SociosService.getAllSocios();
  } catch (error) {
    console.error("Error al obtener socios:", error);
    return { success: false, message: "Error al cargar socios" };
  }
});

ipcMain.handle("registrar-socio", async (event, socioData) => {
  try {
    if (!currentUser) {
      return { success: false, message: "No hay usuario autenticado" };
    }
    return await SociosService.registrarSocio(socioData, currentUser.id);
  } catch (error) {
    console.error("Error al registrar socio:", error);
    return { success: false, message: "Error al registrar socio" };
  }
});

ipcMain.handle("actualizar-socio", async (event, socioData) => {
  try {
    if (!currentUser) {
      return { success: false, message: "No hay usuario autenticado" };
    }
    return await SociosService.actualizarSocio(socioData);
  } catch (error) {
    console.error("Error al actualizar socio:", error);
    return { success: false, message: "Error al actualizar socio" };
  }
});

ipcMain.handle("registrar-asistencia", async (event, idSocio) => {
  try {
    if (!currentUser) {
      return { success: false, message: "No hay usuario autenticado" };
    }
    return await SociosService.registrarAsistencia(idSocio, currentUser.id);
  } catch (error) {
    console.error("Error al registrar asistencia:", error);
    return { success: false, message: "Error al registrar asistencia" };
  }
});

ipcMain.handle("get-estadisticas-socios", async () => {
  try {
    return await SociosService.getEstadisticas();
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return { success: false, message: "Error al obtener estadísticas" };
  }
});

ipcMain.handle("buscar-socios", async (event, query) => {
  try {
    return await SociosService.buscarSocios(query);
  } catch (error) {
    console.error("Error al buscar socios:", error);
    return { success: false, message: "Error al buscar socios" };
  }
});

ipcMain.handle("registrar-pago", async (event, pagoData) => {
  try {
    if (!currentUser) {
      return { success: false, message: "No hay usuario autenticado" };
    }
    return await SociosService.registrarPago(pagoData, currentUser.id);
  } catch (error) {
    console.error("Error al registrar pago:", error);
    return { success: false, message: "Error al registrar pago" };
  }
});

ipcMain.handle("get-historial-pagos", async (event, idSocio) => {
  try {
    return await SociosService.getHistorialPagos(idSocio);
  } catch (error) {
    console.error("Error al obtener historial de pagos:", error);
    return { success: false, message: "Error al cargar historial" };
  }
});

ipcMain.handle("eliminar-socio", async (event, idSocio) => {
  try {
    return await SociosService.eliminarSocio(idSocio);
  } catch (error) {
    console.error("Error al eliminar socio:", error);
    return { success: false, message: "Error al eliminar socio" };
  }
});

// ============================================================
// HANDLERS IPC - Ventas
// ============================================================

const VentasService = require("./utils/ventas");

ipcMain.handle("procesar-venta", async (event, ventaData) => {
  try {
    if (!currentUser) {
      return { success: false, message: "No hay usuario autenticado" };
    }
    return await VentasService.procesarVenta(ventaData, currentUser.id);
  } catch (error) {
    console.error("Error al procesar venta:", error);
    return { success: false, message: "Error al procesar venta" };
  }
});

ipcMain.handle("get-historial-ventas", async (event, fechaInicio, fechaFin) => {
  try {
    return await VentasService.getHistorialVentas(fechaInicio, fechaFin);
  } catch (error) {
    console.error("Error al obtener historial de ventas:", error);
    return { success: false, message: "Error al cargar historial" };
  }
});

ipcMain.handle("get-detalle-venta", async (event, idVenta) => {
  try {
    return await VentasService.getDetalleVenta(idVenta);
  } catch (error) {
    console.error("Error al obtener detalle de venta:", error);
    return { success: false, message: "Error al cargar detalle" };
  }
});

ipcMain.handle("get-estadisticas-ventas", async () => {
  try {
    return await VentasService.getEstadisticasVentas();
  } catch (error) {
    console.error("Error al obtener estadísticas de ventas:", error);
    return { success: false, message: "Error al obtener estadísticas" };
  }
});

ipcMain.handle("cancelar-venta", async (event, idVenta) => {
  try {
    if (!currentUser) {
      return { success: false, message: "No hay usuario autenticado" };
    }
    return await VentasService.cancelarVenta(idVenta, currentUser.id);
  } catch (error) {
    console.error("Error al cancelar venta:", error);
    return { success: false, message: "Error al cancelar venta" };
  }
});

// ============================================================
// HANDLERS IPC - Ventanas y Diálogos
// ============================================================

ipcMain.handle("show-confirmation", async (event, options) => {
  const { dialog } = require("electron");
  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Sí", "No"],
    defaultId: 1,
    title: options.title || "Confirmación",
    message: options.message || "¿Estás seguro?",
  });
  return result.response === 0;
});

ipcMain.handle("show-error", async (event, message) => {
  const { dialog } = require("electron");
  await dialog.showErrorBox("Error", message);
});

ipcMain.handle("show-info", async (event, options) => {
  const { dialog } = require("electron");
  await dialog.showMessageBox(mainWindow, {
    type: "info",
    title: options.title || "Información",
    message: options.message || "",
  });
});

// Manejar errores no capturados
process.on("uncaughtException", (error) => {
  console.error("Error no capturado:", error);
  
  const { dialog } = require("electron");
  dialog.showErrorBox(
    "Error Crítico",
    `Ha ocurrido un error inesperado:\n\n${error.message}`
  );
});

console.log("Aplicación Gimnasio iniciada correctamente");
console.log("Estado de BD:", isDbConnected ? "Conectado" : "Desconectado");
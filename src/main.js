const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

// Variables globales
let mainWindow;
let currentUser = null;

// Función para crear la ventana principal
function createWindow() {
  // Crear la ventana del navegador
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
    icon: path.join(__dirname, "../assets/icons/gym-icon.png"), // Lo crearemos después
    show: false, // No mostrar hasta que esté listo
    titleBarStyle: "default",
  });

  // Cargar la página de login inicialmente
  mainWindow.loadFile(path.join(__dirname, "renderer/pages/login.html"));

  // Mostrar ventana cuando esté lista
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Abrir DevTools en desarrollo
    // Configurar el entorno de desarrollo
    if (process.env.NODE_ENV === "development") {
      // Comentar por ahora electron-reload hasta que tengamos más archivos
      /*
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
  */
    }
  });

  // Evento cuando se cierra la ventana
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Prevenir navegación externa
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== "file://") {
      event.preventDefault();
    }
  });
}

// Función para crear el menú de la aplicación
function createMenu() {
  const template = [
    {
      label: "Archivo",
      submenu: [
        {
          label: "Cerrar Sesión",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            logout();
          },
        },
        {
          type: "separator",
        },
        {
          label: "Salir",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Ver",
      submenu: [
        {
          label: "Recargar",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            mainWindow.webContents.reload();
          },
        },
        {
          label: "Pantalla Completa",
          accelerator: "F11",
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          },
        },
        {
          type: "separator",
        },
        {
          label: "Herramientas de Desarrollador",
          accelerator: "F12",
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: "Ayuda",
      submenu: [
        {
          label: "Acerca de",
          click: () => {
            // Mostrar información de la app
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Acerca de Gimnasio App",
              message: "Sistema de Gestión para Gimnasio",
              detail: "Versión 1.0.0\nDesarrollado con Electron y MySQL",
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Eventos del ciclo de vida de la aplicación
app.whenReady().then(() => {
  createWindow();
  createMenu();

  // En macOS, recrear ventana cuando se hace clic en el dock
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Salir cuando todas las ventanas estén cerradas
app.on("window-all-closed", () => {
  // En macOS, mantener la app activa hasta que el usuario salga explícitamente
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Función para cerrar sesión
function logout() {
  currentUser = null;
  if (mainWindow) {
    // Limpiar cualquier dato en memoria
    mainWindow.webContents.session.clearStorageData();
    
    // Cargar la página de login
    mainWindow.loadFile(path.join(__dirname, 'renderer/pages/login.html'));
  }
  
  console.log('Sesión cerrada correctamente');
}

// Comunicación IPC (Inter-Process Communication) con el renderer
// Estos son los "puentes" entre el proceso principal y las páginas

// Login exitoso
ipcMain.handle("login-success", async (event, userData) => {
  currentUser = userData;
  // Cargar dashboard después del login
  mainWindow.loadFile(path.join(__dirname, "renderer/pages/dashboard.html"));
  return { success: true };
});

// Obtener usuario actual
ipcMain.handle("get-current-user", async (event) => {
  return currentUser;
});

// Navegar entre páginas
ipcMain.handle("navigate-to", async (event, page) => {
  const validPages = ["dashboard", "ventas", "productos", "clientes", "acceso"];

  if (validPages.includes(page)) {
    mainWindow.loadFile(path.join(__dirname, `renderer/pages/${page}.html`));
    return { success: true };
  }

  return { success: false, error: "Página no válida" };
});

// Minimizar ventana
ipcMain.handle("minimize-window", async (event) => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// Maximizar/restaurar ventana
ipcMain.handle("toggle-maximize", async (event) => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});

// Cerrar aplicación
ipcMain.handle("close-app", async (event) => {
  app.quit();
});

// Mostrar diálogo de confirmación
ipcMain.handle("show-confirmation", async (event, options) => {
  const { dialog } = require("electron");
  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Sí", "No"],
    defaultId: 1,
    title: options.title || "Confirmación",
    message: options.message || "¿Estás seguro?",
  });

  return result.response === 0; // true si presionó "Sí"
});

// Mostrar mensaje de error
ipcMain.handle("show-error", async (event, message) => {
  const { dialog } = require("electron");
  await dialog.showErrorBox("Error", message);
});

// Mostrar mensaje de información
ipcMain.handle("show-info", async (event, options) => {
  const { dialog } = require("electron");
  await dialog.showMessageBox(mainWindow, {
    type: "info",
    title: options.title || "Información",
    message: options.message || "",
  });
});

// Manejar logout
ipcMain.handle('logout', async (event) => {
  logout();
  return { success: true };
});

// Configurar el entorno de desarrollo
if (process.env.NODE_ENV === "development") {
  // Recargar automáticamente en desarrollo
  require("electron-reload")(__dirname, {
    electron: path.join(__dirname, "..", "node_modules", ".bin", "electron"),
    hardResetMethod: "exit",
  });
}

// Prevenir que la aplicación se cierre sin confirmación
app.on("before-quit", async (event) => {
  if (currentUser) {
    event.preventDefault();

    const { dialog } = require("electron");
    const result = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Salir", "Cancelar"],
      defaultId: 1,
      title: "Confirmar salida",
      message: "¿Estás seguro de que quieres salir de la aplicación?",
    });

    if (result.response === 0) {
      app.exit();
    }
  }
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

console.log("🚀 Aplicación Gimnasio iniciada correctamente");

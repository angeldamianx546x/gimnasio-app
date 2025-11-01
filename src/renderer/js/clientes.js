const { ipcRenderer } = require("electron");

// Funcionalidad básica por ahora
document.addEventListener("DOMContentLoaded", () => {
  console.log("Página de clientes cargada");

  // Navegación básica
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const page = item.getAttribute("data-page");
      await ipcRenderer.invoke("navigate-to", page);
    });
  });

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const confirmed = await ipcRenderer.invoke("show-confirmation", {
        title: "Cerrar Sesión",
        message: "¿Estás seguro de que quieres cerrar sesión?",
      });

      if (confirmed) {
        try {
          await ipcRenderer.invoke("logout");
          console.log("Logout exitoso");
        } catch (error) {
          console.error("Error durante logout:", error);
          await ipcRenderer.invoke("navigate-to", "login");
        }
      }
    });
  }
});

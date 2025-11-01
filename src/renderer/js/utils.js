const { ipcRenderer } = require('electron');

// Función global de logout
window.globalLogout = async function() {
    const confirmed = await ipcRenderer.invoke('show-confirmation', {
        title: 'Cerrar Sesión',
        message: '¿Estás seguro de que quieres cerrar sesión?'
    });

    if (confirmed) {
        try {
            await ipcRenderer.invoke('logout');
            console.log('Logout exitoso');
        } catch (error) {
            console.error('Error durante logout:', error);
            // Fallback: navegar directamente al login
            await ipcRenderer.invoke('navigate-to', 'login');
        }
    }
};

// Función global de navegación
window.globalNavigate = async function(page) {
    try {
        await ipcRenderer.invoke('navigate-to', page);
    } catch (error) {
        console.error('Error navegando a:', page, error);
    }
};
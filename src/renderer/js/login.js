// Sistema de login
const { ipcRenderer } = require('electron');

class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.focusUsername();
    }

    bindEvents() {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');

        // Evento de submit del formulario
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter en los campos
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        // Limpiar errores al escribir
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.clearError();
                this.clearFieldError(input);
            });
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Validar campos
        if (!this.validateFields(username, password)) {
            return;
        }

        // Mostrar estado de carga
        this.setLoadingState(true);

        try {
            // Simular autenticación (por ahora)
            const result = await this.authenticateUser(username, password);
            
            if (result.success) {
                await this.handleLoginSuccess(result.user);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showError('Error de conexión. Intenta nuevamente.');
        } finally {
            this.setLoadingState(false);
        }
    }

    validateFields(username, password) {
        let isValid = true;

        // Validar usuario
        if (!username) {
            this.showFieldError('username', 'El usuario es requerido');
            isValid = false;
        } else if (username.length < 3) {
            this.showFieldError('username', 'El usuario debe tener al menos 3 caracteres');
            isValid = false;
        }

        // Validar contraseña
        if (!password) {
            this.showFieldError('password', 'La contraseña es requerida');
            isValid = false;
        } else if (password.length < 4) {
            this.showFieldError('password', 'La contraseña debe tener al menos 4 caracteres');
            isValid = false;
        }

        return isValid;
    }

    async authenticateUser(username, password) {
        // Por ahora, usuarios hardcodeados para testing
        // Luego conectaremos con la base de datos MySQL
        const usuarios = {
            'admin': { password: 'admin123', tipo: 'jefe', nombre: 'Administrador' },
            'empleado1': { password: 'emp123', tipo: 'empleado', nombre: 'Juan Pérez' },
            'vendedor': { password: 'vend123', tipo: 'empleado', nombre: 'María García' }
        };

        // Simular delay de red
        await this.delay(1000);

        const user = usuarios[username.toLowerCase()];
        
        if (!user) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Contraseña incorrecta' };
        }

        return {
            success: true,
            user: {
                id: Math.floor(Math.random() * 1000),
                username: username,
                nombre: user.nombre,
                tipo: user.tipo,
                loginTime: new Date().toISOString()
            }
        };
    }

    async handleLoginSuccess(userData) {
        // Enviar datos del usuario al proceso principal
        const result = await ipcRenderer.invoke('login-success', userData);
        
        if (result.success) {
            // El main.js ya cargará el dashboard
            console.log('Login exitoso:', userData);
        }
    }

    setLoadingState(loading) {
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoading = loginBtn.querySelector('.btn-loading');

        if (loading) {
            loginBtn.disabled = true;
            loginBtn.classList.add('loading');
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-block';
        } else {
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            btnText.style.display = 'inline-block';
            btnLoading.style.display = 'none';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        errorText.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            this.clearError();
        }, 5000);
    }

    clearError() {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';
    }

    showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        const formGroup = field.closest('.form-group');
        
        // Remover error anterior
        this.clearFieldError(field);
        
        // Agregar clase de error
        formGroup.classList.add('error');
        
        // Crear mensaje de error
        const errorSpan = document.createElement('span');
        errorSpan.className = 'field-error';
        errorSpan.textContent = message;
        
        // Insertar después del input
        field.parentNode.insertBefore(errorSpan, field.nextSibling);
        
        // Focus en el campo con error
        field.focus();
    }

    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        formGroup.classList.remove('error', 'success');
        
        // Remover mensaje de error existente
        const existingError = formGroup.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    focusUsername() {
        const usernameField = document.getElementById('username');
        if (usernameField) {
            usernameField.focus();
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

// Credenciales de prueba para desarrollo
console.log('=== CREDENCIALES DE PRUEBA ===');
console.log('Admin: admin / admin123');
console.log('Empleado: empleado1 / emp123');
console.log('Vendedor: vendedor / vend123');
console.log('===============================');
// src/renderer/js/login.js
const { ipcRenderer } = require('electron');

class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.focusUsername();
        this.showCredentials();
    }

    bindEvents() {
        const loginForm = document.getElementById('loginForm');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter en los campos
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
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
            // Intentar autenticación con la base de datos
            const result = await ipcRenderer.invoke('login-success', {
                username: username,
                password: password
            });
            
            if (result.success) {
                console.log('Login exitoso:', result.user.nombre);
                // El main.js ya cargará el dashboard
            } else {
                this.showError(result.message || 'Error de autenticación');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showError('Error de conexión con la base de datos. Verifica que MySQL esté ejecutándose.');
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

    showCredentials() {
        console.log('IMPORTANTE:');
        console.log('1. MySQL debe estar ejecutándose en el puerto 3306');
        console.log('2. La base de datos "gimnasio" debe existir');
        console.log('3. El usuario root no debe tener contraseña');
        console.log('4. Ejecuta el script SQL proporcionado para crear las tablas');
        console.log('===============================');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
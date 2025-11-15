// src/utils/auth.js
const bcrypt = require('bcrypt');
const { getPool } = require('../../config/database');

class AuthService {
    /**
     * Autenticar usuario con la base de datos
     */
    static async authenticateUser(username, password) {
        try {
            const pool = getPool();
            
            // Buscar usuario en la base de datos
            const [rows] = await pool.query(
                'SELECT id_usuario, nombre, usuario, contraseña, rol FROM usuarios WHERE usuario = ?',
                [username]
            );

            if (rows.length === 0) {
                return {
                    success: false,
                    message: 'Usuario no encontrado'
                };
            }

            const user = rows[0];

            // Verificar contraseña
            const passwordMatch = await bcrypt.compare(password, user.contraseña);

            if (!passwordMatch) {
                return {
                    success: false,
                    message: 'Contraseña incorrecta'
                };
            }

            // Registrar actividad de login
            await pool.query(
                'INSERT INTO historial_actividades (id_usuario, accion, descripcion) VALUES (?, ?, ?)',
                [user.id_usuario, 'Inicio de sesión', `Usuario ${user.nombre} inició sesión`]
            );

            return {
                success: true,
                user: {
                    id: user.id_usuario,
                    username: user.usuario,
                    nombre: user.nombre,
                    tipo: user.rol,
                    loginTime: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error en autenticación:', error);
            return {
                success: false,
                message: 'Error al autenticar usuario'
            };
        }
    }

    /**
     * Crear usuario administrador por defecto
     */
    static async createDefaultAdmin() {
        try {
            const pool = getPool();
            
            // Verificar si ya existe un admin
            const [existingUsers] = await pool.query(
                'SELECT COUNT(*) as count FROM usuarios WHERE rol = ?',
                ['administrador']
            );

            if (existingUsers[0].count > 0) {
                console.log('Ya existe un usuario administrador');
                return;
            }

            // Crear contraseña hasheada
            const hashedPassword = await bcrypt.hash('admin123', 10);

            // Insertar usuario admin
            await pool.query(
                'INSERT INTO usuarios (nombre, usuario, contraseña, rol) VALUES (?, ?, ?, ?)',
                ['Administrador', 'admin', hashedPassword, 'administrador']
            );

            console.log('✅ Usuario administrador creado: admin / admin123');
        } catch (error) {
            console.error('Error al crear usuario admin:', error);
        }
    }

    /**
     * Registrar actividad de logout
     */
    static async logoutUser(userId) {
        try {
            const pool = getPool();
            
            await pool.query(
                'INSERT INTO historial_actividades (id_usuario, accion, descripcion) VALUES (?, ?, ?)',
                [userId, 'Cierre de sesión', 'Usuario cerró sesión']
            );

            return { success: true };
        } catch (error) {
            console.error('Error al registrar logout:', error);
            return { success: false };
        }
    }
}

module.exports = AuthService;
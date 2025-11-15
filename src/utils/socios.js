// src/utils/socios.js
const { getPool } = require('../../config/database');

class SociosService {
    /**
     * Obtener todos los socios con su información de membresía
     */
    static async getAllSocios() {
        try {
            const pool = getPool();
            
            const [rows] = await pool.query(`
                SELECT 
                    s.id_socio,
                    s.nombre,
                    s.celular,
                    s.tipo_turno,
                    s.instituto,
                    s.fecha_ingreso,
                    s.mes_inscripcion,
                    p.fecha_fin as fecha_vencimiento,
                    CASE 
                        WHEN p.fecha_fin >= CURDATE() THEN 'activo'
                        ELSE 'vencido'
                    END as estado,
                    DATEDIFF(p.fecha_fin, CURDATE()) as dias_restantes
                FROM socios s
                LEFT JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                ORDER BY s.nombre
            `);

            return { success: true, socios: rows };
        } catch (error) {
            console.error('Error al obtener socios:', error);
            return { success: false, message: 'Error al cargar socios' };
        }
    }

    /**
     * Registrar un nuevo socio
     */
    static async registrarSocio(socioData, userId) {
        const connection = await getPool().getConnection();
        
        try {
            await connection.beginTransaction();

            const {
                nombre,
                celular,
                tipo_turno,
                instituto,
                fecha_ingreso,
                mes_inscripcion,
                tipo_membresia,
                monto_pago
            } = socioData;

            // Insertar socio
            const [socioResult] = await connection.query(
                'INSERT INTO socios (nombre, celular, tipo_turno, instituto, fecha_ingreso, mes_inscripcion, registrado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [nombre, celular, tipo_turno, instituto || null, fecha_ingreso, mes_inscripcion, userId]
            );

            const idSocio = socioResult.insertId;

            // Obtener información de la membresía
            const [membresia] = await connection.query(
                'SELECT id_membresia, duracion_dias FROM membresias WHERE tipo = ?',
                [tipo_membresia]
            );

            if (membresia.length === 0) {
                throw new Error('Tipo de membresía no válido');
            }

            const { id_membresia, duracion_dias } = membresia[0];
            const fecha_inicio = new Date(fecha_ingreso);
            const fecha_fin = new Date(fecha_inicio);
            fecha_fin.setDate(fecha_fin.getDate() + duracion_dias);

            // Registrar pago
            await connection.query(
                'INSERT INTO pagos (id_socio, id_membresia, fecha_pago, monto, fecha_inicio, fecha_fin, registrado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [idSocio, id_membresia, fecha_ingreso, monto_pago, fecha_inicio, fecha_fin, userId]
            );

            await connection.commit();

            return {
                success: true,
                id_socio: idSocio,
                message: 'Socio registrado correctamente'
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error al registrar socio:', error);
            return { success: false, message: error.message || 'Error al registrar socio' };
        } finally {
            connection.release();
        }
    }

    /**
     * Registrar asistencia de un socio
     */
    static async registrarAsistencia(idSocio, userId) {
        try {
            const pool = getPool();
            const fecha = new Date().toISOString().split('T')[0];
            const hora = new Date().toTimeString().split(' ')[0];

            // Verificar si el socio está activo
            const [socio] = await pool.query(`
                SELECT s.nombre, p.fecha_fin
                FROM socios s
                LEFT JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                WHERE s.id_socio = ?
            `, [idSocio]);

            if (socio.length === 0) {
                return { success: false, message: 'Socio no encontrado' };
            }

            const fechaVencimiento = new Date(socio[0].fecha_fin);
            const hoy = new Date();

            if (fechaVencimiento < hoy) {
                return {
                    success: false,
                    message: 'La membresía del socio ha vencido',
                    vencido: true
                };
            }

            // Registrar asistencia
            await pool.query(
                'INSERT INTO asistencias (id_socio, fecha, hora_entrada, registrada_por) VALUES (?, ?, ?, ?)',
                [idSocio, fecha, hora, userId]
            );

            return {
                success: true,
                message: `Asistencia registrada para ${socio[0].nombre}`
            };
        } catch (error) {
            console.error('Error al registrar asistencia:', error);
            return { success: false, message: 'Error al registrar asistencia' };
        }
    }

    /**
     * Obtener estadísticas de socios
     */
    static async getEstadisticas() {
        try {
            const pool = getPool();

            // Socios activos
            const [activos] = await pool.query(`
                SELECT COUNT(*) as count
                FROM socios s
                INNER JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                WHERE p.fecha_fin >= CURDATE()
            `);

            // Socios vencidos
            const [vencidos] = await pool.query(`
                SELECT COUNT(*) as count
                FROM socios s
                INNER JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                WHERE p.fecha_fin < CURDATE()
            `);

            // Próximos a vencer (7 días)
            const [proximosVencer] = await pool.query(`
                SELECT COUNT(*) as count
                FROM socios s
                INNER JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                WHERE p.fecha_fin BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            `);

            // Estudiantes
            const [estudiantes] = await pool.query(`
                SELECT COUNT(*) as count
                FROM socios
                WHERE instituto IS NOT NULL AND instituto != ''
            `);

            return {
                success: true,
                estadisticas: {
                    activos: activos[0].count,
                    vencidos: vencidos[0].count,
                    proximosVencer: proximosVencer[0].count,
                    estudiantes: estudiantes[0].count
                }
            };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return { success: false, message: 'Error al obtener estadísticas' };
        }
    }

    /**
     * Buscar socios por nombre o celular
     */
    static async buscarSocios(query) {
        try {
            const pool = getPool();
            
            const [rows] = await pool.query(`
                SELECT 
                    s.id_socio,
                    s.nombre,
                    s.celular,
                    s.tipo_turno,
                    s.instituto,
                    p.fecha_fin as fecha_vencimiento,
                    CASE 
                        WHEN p.fecha_fin >= CURDATE() THEN 'activo'
                        ELSE 'vencido'
                    END as estado,
                    DATEDIFF(p.fecha_fin, CURDATE()) as dias_restantes
                FROM socios s
                LEFT JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                WHERE s.nombre LIKE ? OR s.celular LIKE ?
                ORDER BY s.nombre
            `, [`%${query}%`, `%${query}%`]);

            return { success: true, socios: rows };
        } catch (error) {
            console.error('Error al buscar socios:', error);
            return { success: false, message: 'Error al buscar socios' };
        }
    }
}

module.exports = SociosService;
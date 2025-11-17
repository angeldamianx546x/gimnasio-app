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
     * Actualizar información de un socio
     */
    static async actualizarSocio(socioData) {
        try {
            const pool = getPool();
            const {
                id_socio,
                nombre,
                celular,
                tipo_turno,
                instituto,
                fecha_ingreso,
                mes_inscripcion
            } = socioData;

            await pool.query(
                'UPDATE socios SET nombre = ?, celular = ?, tipo_turno = ?, instituto = ?, fecha_ingreso = ?, mes_inscripcion = ? WHERE id_socio = ?',
                [nombre, celular, tipo_turno, instituto || null, fecha_ingreso, mes_inscripcion, id_socio]
            );

            return {
                success: true,
                message: 'Socio actualizado correctamente'
            };
        } catch (error) {
            console.error('Error al actualizar socio:', error);
            return { success: false, message: 'Error al actualizar socio' };
        }
    }

    /**
     * Registrar un pago para un socio
     */
    static async registrarPago(pagoData, userId) {
        const connection = await getPool().getConnection();
        
        try {
            await connection.beginTransaction();

            const {
                id_socio,
                tipo_membresia,
                monto,
                fecha_inicio,
                metodo_pago,
                observaciones
            } = pagoData;

            // Obtener información de la membresía
            const [membresia] = await connection.query(
                'SELECT id_membresia, duracion_dias FROM membresias WHERE tipo = ?',
                [tipo_membresia]
            );

            if (membresia.length === 0) {
                throw new Error('Tipo de membresía no válido');
            }

            const { id_membresia, duracion_dias } = membresia[0];
            
            // Calcular fecha fin
            const fechaInicio = new Date(fecha_inicio);
            const fechaFin = new Date(fechaInicio);
            fechaFin.setDate(fechaFin.getDate() + duracion_dias);

            // Registrar pago
            await connection.query(
                'INSERT INTO pagos (id_socio, id_membresia, fecha_pago, monto, fecha_inicio, fecha_fin, registrado_por) VALUES (?, ?, NOW(), ?, ?, ?, ?)',
                [id_socio, id_membresia, monto, fechaInicio, fechaFin, userId]
            );

            await connection.commit();

            return {
                success: true,
                message: 'Pago registrado correctamente',
                fecha_vencimiento: fechaFin.toLocaleDateString('es-ES')
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error al registrar pago:', error);
            return { success: false, message: error.message || 'Error al registrar pago' };
        } finally {
            connection.release();
        }
    }

    /**
     * Obtener historial de pagos de un socio
     */
    static async getHistorialPagos(idSocio) {
        try {
            const pool = getPool();
            
            const [rows] = await pool.query(`
                SELECT 
                    p.id_pago,
                    p.fecha_pago,
                    m.tipo,
                    p.monto,
                    p.fecha_inicio,
                    p.fecha_fin
                FROM pagos p
                INNER JOIN membresias m ON p.id_membresia = m.id_membresia
                WHERE p.id_socio = ?
                ORDER BY p.fecha_pago DESC
            `, [idSocio]);

            return { success: true, pagos: rows };
        } catch (error) {
            console.error('Error al obtener historial de pagos:', error);
            return { success: false, message: 'Error al cargar historial' };
        }
    }

    /**
     * Eliminar un socio
     */
    static async eliminarSocio(idSocio) {
        try {
            const pool = getPool();
            
            // Verificar si el socio existe
            const [socio] = await pool.query(
                'SELECT nombre FROM socios WHERE id_socio = ?',
                [idSocio]
            );

            if (socio.length === 0) {
                return { success: false, message: 'Socio no encontrado' };
            }

            // Eliminar socio (CASCADE eliminará pagos y asistencias)
            await pool.query('DELETE FROM socios WHERE id_socio = ?', [idSocio]);

            return {
                success: true,
                message: `Socio ${socio[0].nombre} eliminado correctamente`
            };
        } catch (error) {
            console.error('Error al eliminar socio:', error);
            return { success: false, message: 'Error al eliminar socio' };
        }
    }

    /**
     * Obtener estadísticas de socios
     */
    static async getEstadisticas() {
        try {
            const pool = getPool();

            // Socios activos (más de 1 día)
            const [activos] = await pool.query(`
                SELECT COUNT(*) as count
                FROM socios s
                INNER JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                WHERE DATEDIFF(p.fecha_fin, CURDATE()) > 1
            `);

            // Socios vencidos
            const [vencidos] = await pool.query(`
                SELECT COUNT(*) as count
                FROM socios s
                LEFT JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                WHERE p.fecha_fin IS NULL OR p.fecha_fin < CURDATE()
            `);

            // Próximos a vencer (0-1 días)
            const [proximosVencer] = await pool.query(`
                SELECT COUNT(*) as count
                FROM socios s
                INNER JOIN (
                    SELECT id_socio, MAX(fecha_fin) as fecha_fin
                    FROM pagos
                    GROUP BY id_socio
                ) p ON s.id_socio = p.id_socio
                WHERE DATEDIFF(p.fecha_fin, CURDATE()) >= 0 
                AND DATEDIFF(p.fecha_fin, CURDATE()) <= 1
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
// src/utils/ventas.js
const { getPool } = require('../../config/database');

class VentasService {
    /**
     * Procesar una venta completa
     */
    static async procesarVenta(ventaData, userId) {
        const connection = await getPool().getConnection();
        
        try {
            await connection.beginTransaction();

            const { carrito, total } = ventaData;

            // Validar que hay productos en el carrito
            if (!carrito || carrito.length === 0) {
                throw new Error('El carrito está vacío');
            }

            // Verificar stock disponible para todos los productos
            for (const item of carrito) {
                const [producto] = await connection.query(
                    'SELECT stock FROM productos WHERE id_producto = ?',
                    [item.id]
                );

                if (producto.length === 0) {
                    throw new Error(`Producto ${item.nombre} no encontrado`);
                }

                if (producto[0].stock < item.cantidad) {
                    throw new Error(`Stock insuficiente para ${item.nombre}. Disponible: ${producto[0].stock}, Solicitado: ${item.cantidad}`);
                }
            }

            // Insertar venta
            const [ventaResult] = await connection.query(
                'INSERT INTO ventas (id_usuario, total) VALUES (?, ?)',
                [userId, total]
            );

            const idVenta = ventaResult.insertId;

            // Insertar detalles de la venta y actualizar stock
            for (const item of carrito) {
                // Insertar detalle
                await connection.query(
                    'INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                    [idVenta, item.id, item.cantidad, item.precio]
                );

                // Actualizar stock
                await connection.query(
                    'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
                    [item.cantidad, item.id]
                );
            }

            await connection.commit();

            return {
                success: true,
                id_venta: idVenta,
                total: total,
                message: 'Venta procesada correctamente'
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error al procesar venta:', error);
            return { 
                success: false, 
                message: error.message || 'Error al procesar la venta' 
            };
        } finally {
            connection.release();
        }
    }

    /**
     * Obtener historial de ventas
     */
    static async getHistorialVentas(fechaInicio = null, fechaFin = null) {
        try {
            const pool = getPool();
            
            let query = `
                SELECT 
                    v.id_venta,
                    v.fecha,
                    v.total,
                    u.nombre as vendedor
                FROM ventas v
                LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
            `;

            const params = [];

            if (fechaInicio && fechaFin) {
                query += ' WHERE DATE(v.fecha) BETWEEN ? AND ?';
                params.push(fechaInicio, fechaFin);
            }

            query += ' ORDER BY v.fecha DESC LIMIT 100';

            const [rows] = await pool.query(query, params);

            return { success: true, ventas: rows };
        } catch (error) {
            console.error('Error al obtener historial:', error);
            return { success: false, message: 'Error al cargar historial' };
        }
    }

    /**
     * Obtener detalle de una venta específica
     */
    static async getDetalleVenta(idVenta) {
        try {
            const pool = getPool();
            
            // Obtener información de la venta
            const [venta] = await pool.query(
                `SELECT 
                    v.id_venta,
                    v.fecha,
                    v.total,
                    u.nombre as vendedor
                FROM ventas v
                LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario
                WHERE v.id_venta = ?`,
                [idVenta]
            );

            if (venta.length === 0) {
                return { success: false, message: 'Venta no encontrada' };
            }

            // Obtener detalles de la venta
            const [detalles] = await pool.query(
                `SELECT 
                    dv.cantidad,
                    dv.precio_unitario,
                    p.nombre as producto,
                    (dv.cantidad * dv.precio_unitario) as subtotal
                FROM detalle_ventas dv
                INNER JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = ?`,
                [idVenta]
            );

            return {
                success: true,
                venta: venta[0],
                detalles: detalles
            };
        } catch (error) {
            console.error('Error al obtener detalle de venta:', error);
            return { success: false, message: 'Error al cargar detalle' };
        }
    }

    /**
     * Obtener estadísticas de ventas
     */
    static async getEstadisticasVentas() {
        try {
            const pool = getPool();

            // Ventas de hoy
            const [ventasHoy] = await pool.query(
                'SELECT COALESCE(SUM(total), 0) as total FROM ventas WHERE DATE(fecha) = CURDATE()'
            );

            // Ventas del mes
            const [ventasMes] = await pool.query(
                'SELECT COALESCE(SUM(total), 0) as total FROM ventas WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())'
            );

            // Productos más vendidos
            const [masVendidos] = await pool.query(
                `SELECT 
                    p.nombre,
                    SUM(dv.cantidad) as total_vendido
                FROM detalle_ventas dv
                INNER JOIN productos p ON dv.id_producto = p.id_producto
                INNER JOIN ventas v ON dv.id_venta = v.id_venta
                WHERE MONTH(v.fecha) = MONTH(CURDATE()) AND YEAR(v.fecha) = YEAR(CURDATE())
                GROUP BY p.id_producto
                ORDER BY total_vendido DESC
                LIMIT 5`
            );

            return {
                success: true,
                estadisticas: {
                    ventasHoy: ventasHoy[0].total,
                    ventasMes: ventasMes[0].total,
                    masVendidos: masVendidos
                }
            };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return { success: false, message: 'Error al obtener estadísticas' };
        }
    }

    /**
     * Cancelar una venta (restaurar stock)
     */
    static async cancelarVenta(idVenta, userId) {
        const connection = await getPool().getConnection();
        
        try {
            await connection.beginTransaction();

            // Verificar que la venta existe
            const [venta] = await connection.query(
                'SELECT id_venta, fecha FROM ventas WHERE id_venta = ?',
                [idVenta]
            );

            if (venta.length === 0) {
                throw new Error('Venta no encontrada');
            }

            // Obtener detalles de la venta
            const [detalles] = await connection.query(
                'SELECT id_producto, cantidad FROM detalle_ventas WHERE id_venta = ?',
                [idVenta]
            );

            // Restaurar stock de cada producto
            for (const detalle of detalles) {
                await connection.query(
                    'UPDATE productos SET stock = stock + ? WHERE id_producto = ?',
                    [detalle.cantidad, detalle.id_producto]
                );
            }

            // Eliminar la venta (CASCADE eliminará los detalles)
            await connection.query('DELETE FROM ventas WHERE id_venta = ?', [idVenta]);

            // Registrar en historial
            await connection.query(
                'INSERT INTO historial_actividades (id_usuario, accion, descripcion) VALUES (?, ?, ?)',
                [userId, 'Cancelar venta', `Venta #${idVenta} cancelada y stock restaurado`]
            );

            await connection.commit();

            return {
                success: true,
                message: 'Venta cancelada y stock restaurado'
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error al cancelar venta:', error);
            return { 
                success: false, 
                message: error.message || 'Error al cancelar venta' 
            };
        } finally {
            connection.release();
        }
    }
}

module.exports = VentasService;
// src/utils/productos.js
const { getPool } = require('../../config/database');

class ProductosService {
    /**
     * Obtener todos los productos disponibles
     */
    static async getAllProducts() {
        try {
            const pool = getPool();
            const [rows] = await pool.query(
                'SELECT id_producto, nombre, precio, stock FROM productos ORDER BY nombre'
            );
            return { success: true, productos: rows };
        } catch (error) {
            console.error('Error al obtener productos:', error);
            return { success: false, message: 'Error al cargar productos' };
        }
    }

    /**
     * Agregar un nuevo producto
     */
    static async addProduct(productData, userId) {
        try {
            const pool = getPool();
            const { nombre, precio, stock } = productData;

            // Validar que no exista un producto con el mismo nombre
            const [existente] = await pool.query(
                'SELECT id_producto FROM productos WHERE nombre = ?',
                [nombre]
            );

            if (existente.length > 0) {
                return { success: false, message: 'Ya existe un producto con ese nombre' };
            }

            const [result] = await pool.query(
                'INSERT INTO productos (nombre, precio, stock, agregado_por) VALUES (?, ?, ?, ?)',
                [nombre, precio, stock, userId]
            );

            return {
                success: true,
                id: result.insertId,
                message: 'Producto agregado correctamente'
            };
        } catch (error) {
            console.error('Error al agregar producto:', error);
            return { success: false, message: 'Error al agregar producto' };
        }
    }

    /**
     * Actualizar un producto existente
     */
    static async updateProduct(productData, userId) {
        try {
            const pool = getPool();
            const { id_producto, nombre, precio, stock } = productData;

            // Verificar que el producto existe
            const [existente] = await pool.query(
                'SELECT id_producto FROM productos WHERE id_producto = ?',
                [id_producto]
            );

            if (existente.length === 0) {
                return { success: false, message: 'Producto no encontrado' };
            }

            // Verificar que no exista otro producto con el mismo nombre
            const [duplicado] = await pool.query(
                'SELECT id_producto FROM productos WHERE nombre = ? AND id_producto != ?',
                [nombre, id_producto]
            );

            if (duplicado.length > 0) {
                return { success: false, message: 'Ya existe otro producto con ese nombre' };
            }

            await pool.query(
                'UPDATE productos SET nombre = ?, precio = ?, stock = ?, agregado_por = ? WHERE id_producto = ?',
                [nombre, precio, stock, userId, id_producto]
            );

            return {
                success: true,
                message: 'Producto actualizado correctamente'
            };
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            return { success: false, message: 'Error al actualizar producto' };
        }
    }

    /**
     * Actualizar stock de un producto
     */
    static async updateStock(productId, newStock, userId) {
        try {
            const pool = getPool();

            // Verificar que el producto existe
            const [existente] = await pool.query(
                'SELECT id_producto, nombre, stock FROM productos WHERE id_producto = ?',
                [productId]
            );

            if (existente.length === 0) {
                return { success: false, message: 'Producto no encontrado' };
            }

            const stockAnterior = existente[0].stock;

            await pool.query(
                'UPDATE productos SET stock = ?, agregado_por = ? WHERE id_producto = ?',
                [newStock, userId, productId]
            );

            // Registrar en historial de actividades
            const diferencia = newStock - stockAnterior;
            const accion = diferencia > 0 ? 'Aumentar stock' : 'Reducir stock';
            const descripcion = `Stock de "${existente[0].nombre}" cambió de ${stockAnterior} a ${newStock} (${diferencia > 0 ? '+' : ''}${diferencia})`;

            await pool.query(
                'INSERT INTO historial_actividades (id_usuario, accion, descripcion) VALUES (?, ?, ?)',
                [userId, accion, descripcion]
            );

            return {
                success: true,
                message: 'Stock actualizado correctamente'
            };
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            return { success: false, message: 'Error al actualizar stock' };
        }
    }

    /**
     * Eliminar un producto
     */
    static async deleteProduct(productId) {
        try {
            const pool = getPool();

            // Verificar que el producto existe
            const [existente] = await pool.query(
                'SELECT nombre FROM productos WHERE id_producto = ?',
                [productId]
            );

            if (existente.length === 0) {
                return { success: false, message: 'Producto no encontrado' };
            }

            // Verificar si el producto está en alguna venta
            const [ventasRelacionadas] = await pool.query(
                'SELECT COUNT(*) as count FROM detalle_ventas WHERE id_producto = ?',
                [productId]
            );

            if (ventasRelacionadas[0].count > 0) {
                return { 
                    success: false, 
                    message: 'No se puede eliminar el producto porque está asociado a ventas' 
                };
            }

            await pool.query('DELETE FROM productos WHERE id_producto = ?', [productId]);

            return {
                success: true,
                message: `Producto "${existente[0].nombre}" eliminado correctamente`
            };
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            return { success: false, message: 'Error al eliminar producto' };
        }
    }

    /**
     * Buscar productos por nombre
     */
    static async searchProducts(query) {
        try {
            const pool = getPool();
            const [rows] = await pool.query(
                'SELECT id_producto, nombre, precio, stock FROM productos WHERE nombre LIKE ? ORDER BY nombre',
                [`%${query}%`]
            );
            return { success: true, productos: rows };
        } catch (error) {
            console.error('Error al buscar productos:', error);
            return { success: false, message: 'Error al buscar productos' };
        }
    }

    /**
     * Obtener productos con stock bajo
     */
    static async getLowStockProducts(threshold = 5) {
        try {
            const pool = getPool();
            const [rows] = await pool.query(
                'SELECT id_producto, nombre, precio, stock FROM productos WHERE stock <= ? AND stock > 0 ORDER BY stock ASC',
                [threshold]
            );
            return { success: true, productos: rows };
        } catch (error) {
            console.error('Error al obtener productos con stock bajo:', error);
            return { success: false, message: 'Error al cargar productos' };
        }
    }

    /**
     * Obtener productos sin stock
     */
    static async getOutOfStockProducts() {
        try {
            const pool = getPool();
            const [rows] = await pool.query(
                'SELECT id_producto, nombre, precio, stock FROM productos WHERE stock = 0 ORDER BY nombre'
            );
            return { success: true, productos: rows };
        } catch (error) {
            console.error('Error al obtener productos sin stock:', error);
            return { success: false, message: 'Error al cargar productos' };
        }
    }
}

module.exports = ProductosService;
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
     * Actualizar stock de un producto
     */
    static async updateStock(productId, newStock, userId) {
        try {
            const pool = getPool();

            await pool.query(
                'UPDATE productos SET stock = ?, agregado_por = ? WHERE id_producto = ?',
                [newStock, userId, productId]
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
}

module.exports = ProductosService;

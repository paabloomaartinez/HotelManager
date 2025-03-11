import pool from '../config/db.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

class Employees {

    static async getEmployees(req, res) {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    p.nombre AS Nombre,
                    p.apellidos AS Apellidos,
                    p.numeroDocumento AS Numero_documento,
                    e.nombreUsuario AS Usuario,
                    e.rol AS Rol
                FROM 
                    Empleado e
                JOIN 
                    Persona p ON e.numeroDocumento = p.numeroDocumento;
            `);

            res.status(200).json(rows);
        } catch (error) {
            console.error('Error al obtener los empleados:', error);
            res.status(500).json({ error: 'Error al obtener los empleados' });
        }
    }

    static async addEmployee(req, res) {
        const { Numero_documento, Tipo_documento, Nombre, Apellidos, Usuario, contrasena, Rol } = req.body;
        console.log(req.body);
        let conn;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            // Verificar si el usuario o documento ya existe
            const [existingUser] = await conn.query(`
                SELECT * FROM Empleado WHERE nombreUsuario = ? OR numeroDocumento = ?
            `, [Usuario, Numero_documento]);

            if (existingUser.length > 0) {
                throw new Error('El usuario o el número de documento ya existen');
            }

            // Insertar en la tabla Persona
            await conn.query(`
                INSERT INTO Persona (numeroDocumento, tipoDocumento, nombre, apellidos)
                VALUES (?, ?, ?, ?)
            `, [Numero_documento, Tipo_documento, Nombre, Apellidos]);

            // Hashear la contraseña
            const hashedPassword = await argon2.hash(contrasena);

            // Insertar en la tabla Empleado
            await conn.query(`
                INSERT INTO Empleado (numeroDocumento, nombreUsuario, contrasena, rol)
                VALUES (?, ?, ?, ?)
            `, [Numero_documento, Usuario, hashedPassword, Rol]);

            // Confirmar la transacción
            await conn.commit();
            conn.release();

            // Devolver la lista actualizada de empleados
            const [rows] = await pool.query(`
                SELECT 
                    p.nombre AS Nombre,
                    p.apellidos AS Apellidos,
                    p.numeroDocumento AS Numero_documento,
                    e.nombreUsuario AS Usuario,
                    e.rol AS Rol
                FROM 
                    Empleado e
                JOIN 
                    Persona p ON e.numeroDocumento = p.numeroDocumento;
            `);

            res.status(200).json(rows);

            const io = req.app.get("io");
            io.emit("actualizarEmpleado");
        } catch (err) {
            if (conn) {
                await conn.rollback();
                conn.release();
            }
            res.status(500).json({ error: 'Error al añadir empleado', details: err.message });
        }
    }

    static async updateEmployee(req, res) {
        const { Nombre, Apellidos, Numero_documento, Rol, Usuario } = req.body;
        let conn;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            // Actualizar los datos en la tabla Persona
            await conn.query(`
                UPDATE Persona 
                SET nombre = ?, apellidos = ?
                WHERE numeroDocumento = ?
            `, [Nombre, Apellidos, Numero_documento]);

            // Actualizar los datos en la tabla Empleado
            await conn.query(`
                UPDATE Empleado 
                SET rol = ?, nombreUsuario = ?
                WHERE numeroDocumento = ?
            `, [Rol, Usuario, Numero_documento]);

            await conn.commit();
            conn.release();

            res.status(200).json({ message: 'Empleado actualizado correctamente' });

            const io = req.app.get("io");
            io.emit("actualizarEmpleado");
        } catch (error) {
            if (conn) {
                await conn.rollback();
                conn.release();
            }
            res.status(500);
        }
    }

    static async deleteEmployee(req, res) {
        const { numeroDocumento } = req.params;
        let conn;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            // Eliminar al empleado de la tabla Empleado
            await conn.query(`
                DELETE FROM Empleado WHERE numeroDocumento = ?
            `, [numeroDocumento]);

            // Eliminar a la persona asociada de la tabla Persona
            await conn.query(`
                DELETE FROM Persona WHERE numeroDocumento = ?
            `, [numeroDocumento]);

            // Confirmar la transacción
            await conn.commit();
            conn.release();

            res.status(200).json({ message: 'Empleado eliminado correctamente' });

            const io = req.app.get("io");
            io.emit("actualizarEmpleado");
        } catch (err) {
            if (conn) {
                await conn.rollback();
                conn.release();
            }
            res.status(500);
        }
    }

    static async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const token = req.headers['authorization']?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'No se proporcionó un token de autenticación.' });
            }

            let decodedUser;
            try {
                decodedUser = jwt.verify(token, process.env.SECRET_KEY);
            } catch (error) {
                return res.status(403).json({ error: 'Token inválido o expirado.' });
            }

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Por favor proporciona la contraseña actual y la nueva contraseña.' });
            }

            const [rows] = await pool.query(
                'SELECT contrasena FROM Empleado WHERE nombreUsuario = ?',
                [decodedUser.nombreUsuario]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            }

            const storedPassword = rows[0].contrasena;

            const isMatch = await argon2.verify(storedPassword, currentPassword);
            if (!isMatch) {
                return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
            }

            const hashedNewPassword = await argon2.hash(newPassword);

            await pool.query(
                'UPDATE Empleado SET contrasena = ? WHERE nombreUsuario = ?',
                [hashedNewPassword, decodedUser.nombreUsuario]
            );

            res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
        } catch (error) {
            console.error('Error al cambiar la contraseña:', error);
            res.status(500).json({ error: 'Error en el servidor al intentar cambiar la contraseña.' });
        }
    }

    static async changeRole(req, res) {
        const { newRole } = req.body;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        try {
            // Decodificar el token para obtener la información del usuario actual
            const decoded = jwt.verify(token, process.env.SECRET_KEY);

            // Verificar si el usuario es administrador para permitir el cambio de rol
            if (decoded.rol !== 'Administrador') {
                return res.status(403).json({ error: 'No tienes permisos para cambiar de rol' });
            }

            // Crear un nuevo token con el rol actualizado
            const updatedUserData = {
                numeroDocumento: decoded.numeroDocumento,
                nombreUsuario: decoded.nombreUsuario,
                nombre: decoded.nombre,
                apellidos: decoded.apellidos,
                rol: newRole // Cambiar el rol al nuevo rol proporcionado
            };

            // Firmar el nuevo token
            const newToken = jwt.sign(updatedUserData, process.env.SECRET_KEY, { expiresIn: '4h' });

            // Devolver el nuevo token al cliente
            res.status(200).json({
                message: `Rol cambiado exitosamente a ${newRole}`,
                newToken
            });
        } catch (error) {
            console.error('Error al cambiar el rol:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

export default Employees;
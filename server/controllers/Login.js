import pool from '../config/db.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

class Login {
    static async login(req, res) {
        const { nombreUsuario, contrasena } = req.body;

        if (!nombreUsuario || !contrasena) {
            return res
                .status(400)
                .json({ error: 'Por favor, proporciona un usuario y una contraseña' });
        }

        try {
            // Verificar si el usuario existe
            const [rows] = await pool.query(
                `
        SELECT
          p.numeroDocumento,
          p.nombre,
          p.apellidos,
          e.nombreUsuario,
          e.contrasena,
          e.rol
        FROM
          Empleado e
        JOIN
          Persona p ON e.numeroDocumento = p.numeroDocumento
        WHERE
          e.nombreUsuario = ?;
      `,
                [nombreUsuario]
            );

            // Si el usuario no existe
            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const usuario = rows[0]; // Extraer el usuario del resultado

            // Verificar la contraseña usando argon2
            const isMatch = await argon2.verify(usuario.contrasena, contrasena);

            if (!isMatch) {
                return res.status(401).json({ error: 'Contraseña incorrecta' });
            }

            // Crear un token JWT
            const token = jwt.sign(
                {
                    numeroDocumento: usuario.numeroDocumento,
                    nombreUsuario: usuario.nombreUsuario,
                    nombre: usuario.nombre,
                    apellidos: usuario.apellidos,
                    rol: usuario.rol,
                },
                process.env.SECRET_KEY,
                { expiresIn: '8h' }
            );

            // Respuesta exitosa con token y datos del usuario
            res.status(200).json({
                message: 'Inicio de sesión exitoso',
                token,
                user: {
                    numeroDocumento: usuario.numeroDocumento,
                    nombre: usuario.nombre,
                    apellidos: usuario.apellidos,
                    nombreUsuario: usuario.nombreUsuario,
                    rol: usuario.rol,
                },
            });
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            res.status(500).json({ error: 'Error al obtener el usuario' });
        }
    }

    static async getReservation(req, res) {
        const { localizador, email } = req.body;

        if (!localizador || !email) {
            return res.status(400).json({ error: 'Por favor, proporciona un localizador y un correo electrónico' });
        }

        try {
            // Consulta para obtener la reserva y verificar el cliente
            const [rows] = await pool.query(
                `SELECT 
                    r.idReserva, 
                    r.fechaEntrada, 
                    r.fechaSalida, 
                    r.numPersonas, 
                    r.precio, 
                    r.estado, 
                    c.nombre AS nombreCliente, 
                    c.apellidos, 
                    c.correo 
                 FROM 
                    Reserva r
                 JOIN 
                    Cliente c ON r.idCliente = c.idCliente
                 WHERE 
                    r.idReserva = ? AND c.correo = ?;`,
                [localizador, email]
            );

            // Si no se encuentra la reserva
            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: 'Reserva no encontrada o los datos no coinciden' });
            }

            const reserva = rows[0];

            // Crear un token JWT válido por 30 minutos
            const token = jwt.sign(
                {
                    idReserva: reserva.idReserva,
                    email: reserva.correo,
                    nombreCliente: reserva.nombreCliente,
                },
                process.env.SECRET_KEY,
                { expiresIn: '15m' } // Tiempo de expiración del token
            );

            // Respuesta exitosa con los datos de la reserva y el token
            res.status(200).json({
                message: 'Reserva encontrada',
                reserva: {
                    idReserva: reserva.idReserva,
                    fechaEntrada: reserva.fechaEntrada,
                    fechaSalida: reserva.fechaSalida,
                    numPersonas: reserva.numPersonas,
                    precio: reserva.precio,
                    estado: reserva.estado,
                    nombreCliente: reserva.nombreCliente,
                    apellidos: reserva.apellidos,
                    correo: reserva.correo,
                },
                token,
            });
        } catch (error) {
            console.error('Error al consultar la reserva:', error);
            res.status(500).json({ error: 'Error interno del servidor al consultar la reserva' });
        }
    }
};

export default Login;
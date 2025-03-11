import pool from '../config/db.js';

class Rooms {
    // Obtener habitaciones con sus estados y tipos
    static async getRooms(req, res) {
        try {
            const [rows] = await pool.query(`
                SELECT
                    h.numHabitacion AS Numero,
                    h.numCamas AS Num_camas,
                    IF(h.opcionSupletoria = 1, 'Sí', 'No') AS Opcion_supletoria,
                    h.tipo AS Tipo,
                    h.estado AS Estado
                FROM
                    Habitacion h;
            `);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error al obtener las habitaciones:', error);
            res.status(500).json({ error: 'Error al obtener las habitaciones' });
        }
    }

    // Actualizar el estado de una habitación
    static async setRoomState(req, res) {
        const { Numero, Estado } = req.body;
        let conn;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            // Verificar que el estado proporcionado es válido
            const validStates = ['Limpia', 'Sucia', 'Disponible', 'Ocupada', 'Fuera de Servicio', 'Bloqueada'];
            if (!validStates.includes(Estado)) {
                throw new Error(`El estado proporcionado (${Estado}) no es válido.`);
            }

            // Actualizar el estado de la habitación
            await conn.query(
                'UPDATE Habitacion SET estado = ? WHERE numHabitacion = ?;',
                [Estado, Numero]
            );

            await conn.commit();
            conn.release();

            res.status(200).json({ message: 'Estado de la habitación actualizado correctamente' });

            const io = req.app.get("io");
            io.emit('actualizarHabitaciones');

        } catch (error) {
            if (conn) await conn.rollback();
            console.error('Error al actualizar el estado de la habitación:', error);
            res.status(500);
        } finally {
            if (conn) conn.release();
        }
    }

    static async getDirtyRooms(req, res) {
        try {
            const query = `
                SELECT 
                    h.numHabitacion,
                    h.estado,
                    COALESCE(GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' ', p.apellidos) SEPARATOR ', '), 'Sin huéspedes') AS huespedes
                FROM Habitacion h
                LEFT JOIN HabitacionReservada hr ON h.numHabitacion = hr.numHabitacion
                LEFT JOIN Reserva r ON hr.idReserva = r.idReserva 
                    AND r.estado = 'En_curso' 
                    AND CURDATE() BETWEEN r.fechaEntrada AND r.fechaSalida
                LEFT JOIN HuespedHabitacion hh ON r.idReserva = hh.idReserva 
                    AND hr.numHabitacion = hh.numHabitacion
                LEFT JOIN Huesped hu ON hh.numeroDocumento = hu.numeroDocumento
                LEFT JOIN Persona p ON hu.numeroDocumento = p.numeroDocumento
                WHERE h.estado = 'Sucia'
                GROUP BY h.numHabitacion, h.estado;
            `;

            const [rooms] = await pool.query(query);
            res.status(200).json(rooms);
        } catch (error) {
            console.error("Error al obtener habitaciones sucias:", error);
            res.status(500).json({ error: "Error al obtener habitaciones sucias." });
        }
    }



    static async markAsClean(req, res) {
        const { numHabitacion } = req.body;

        try {
            const queryCheckOut = `
            SELECT r.fechaSalida FROM Reserva r
            JOIN HabitacionReservada hr ON hr.idReserva = r.idReserva
            WHERE hr.numHabitacion = ? AND CURDATE() = r.fechaSalida;
          `;

            const [result] = await pool.query(queryCheckOut, [numHabitacion]);

            const nuevoEstado = result.length > 0 ? "Disponible" : "Ocupada";

            const updateQuery = `
            UPDATE Habitacion
            SET estado = ?
            WHERE numHabitacion = ?;
          `;
            await pool.query(updateQuery, [nuevoEstado, numHabitacion]);

            res.status(200).json({ message: `La habitación ${numHabitacion} se marcó como '${nuevoEstado}'.` });

            const io = req.app.get("io");
            io.emit('actualizarHabitaciones');

        } catch (error) {
            console.error("Error al marcar la habitación como limpia:", error);
            res.status(500).json({ error: "Error al actualizar la habitación." });
        }
    }

    static async omitCleaning(req, res) {
        const { numHabitacion } = req.body;

        try {
            // Verificar si hoy es el día de check-out para la habitación
            const queryCheckOut = `
            SELECT r.fechaSalida FROM Reserva r
            JOIN HabitacionReservada hr ON hr.idReserva = r.idReserva
            WHERE hr.numHabitacion = ? AND CURDATE() = r.fechaSalida;
          `;

            const [result] = await pool.query(queryCheckOut, [numHabitacion]);

            // Si es día de check-out, no se puede omitir la limpieza
            if (result.length > 0) {
                return res.status(400).json({
                    error: `No puedes omitir la limpieza de la habitación ${numHabitacion}, ya que es el día de check-out.`,
                });
            }

            // Actualizar la habitación como "Ocupada" (sin limpiar)
            const updateQuery = `
            UPDATE Habitacion
            SET estado = "Ocupada"
            WHERE numHabitacion = ?;
          `;
            await pool.query(updateQuery, [numHabitacion]);

            res.status(200).json({
                message: `La habitación ${numHabitacion} fue marcada como "Ocupada" sin limpieza.`,
            });

            const io = req.app.get("io");
            io.emit('actualizarHabitaciones');

        } catch (error) {
            console.error("Error al omitir la limpieza:", error);
            res.status(500).json({ error: "Error al omitir la limpieza." });
        }
    }

    static async getRoomDetails(req, res) {
        const { idReserva, numHabitacion } = req.params;

        try {
            // Consulta para obtener detalles de la habitación y verificar si tiene opción de supletoria
            const queryRoomDetails = `
            SELECT 
              h.numHabitacion,
              h.tipo,
              h.numCamas,
              h.opcionSupletoria AS supletoriaDisponible
            FROM 
              Habitacion h
            WHERE 
              h.numHabitacion = ?;
          `;

            const [roomDetailsRows] = await pool.query(queryRoomDetails, [numHabitacion]);

            if (roomDetailsRows.length === 0) {
                return res.status(404).json({ error: "Detalles de la habitación no encontrados." });
            }

            const roomDetails = roomDetailsRows[0];

            // Inicializar el valor de supletoriaReservada
            let supletoriaReservada = false;

            // Si la habitación tiene opción de supletoria, verificar si en la reserva se añadió el servicio 3
            if (roomDetails.supletoriaDisponible === 1) {
                const querySupletoriaReservada = `
              SELECT 
                1 AS supletoriaReservada
              FROM 
                Anade
              WHERE 
                idReserva = ? AND idServicio = 3
              LIMIT 1;
            `;

                const [supletoriaRows] = await pool.query(querySupletoriaReservada, [idReserva]);

                // Si se encuentra una fila, significa que la supletoria fue reservada
                supletoriaReservada = supletoriaRows.length > 0;
            }

            // Construir respuesta con todos los detalles
            const response = {
                numHabitacion: roomDetails.numHabitacion,
                tipo: roomDetails.tipo,
                numCamas: roomDetails.numCamas,
                supletoriaDisponible: roomDetails.supletoriaDisponible === 1, // Convertir a booleano
                supletoriaReservada: supletoriaReservada
            };

            res.json(response);
        } catch (error) {
            console.error("Error al obtener los detalles de la habitación:", error);
            res.status(500).json({ error: "Error al obtener los detalles de la habitación." });
        }
    }


}

export default Rooms;

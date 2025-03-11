import pool from '../config/db.js';

class Guests {

    static async registerGuestsForRoom(req, res) {
        const { idReserva, numHabitacion, guests } = req.body;

        try {
            const connection = await pool.getConnection();

            await connection.beginTransaction();

            // Registrar cada huésped y asignarlo a la habitación
            for (const guest of guests) {
                // Verificar si ya existe en Persona
                const [existingPerson] = await connection.query(
                    `SELECT numeroDocumento FROM Persona WHERE numeroDocumento = ?`,
                    [guest.numeroDocumento]
                );

                if (existingPerson.length === 0) {
                    // Insertar datos en la tabla Persona si no existe
                    await connection.query(
                        `INSERT INTO Persona (numeroDocumento, tipoDocumento, nombre, apellidos)
                         VALUES (?, ?, ?, ?)`,
                        [guest.numeroDocumento, guest.tipoDocumento, guest.nombre, guest.apellidos]
                    );
                } else {
                    // Actualizar los datos de la persona si ya existe
                    await connection.query(
                        `UPDATE Persona 
                         SET nombre = ?, apellidos = ?
                         WHERE numeroDocumento = ?`,
                        [guest.nombre, guest.apellidos, guest.numeroDocumento]
                    );
                }

                // Verificar si ya existe en Huesped
                const [existingGuest] = await connection.query(
                    `SELECT numeroDocumento FROM Huesped WHERE numeroDocumento = ?`,
                    [guest.numeroDocumento]
                );

                if (existingGuest.length === 0) {
                    // Insertar datos en la tabla Huesped si no existe
                    await connection.query(
                        `INSERT INTO Huesped (numeroDocumento, fechaNacimiento, fechaCaducidad, fechaEmision, nacionalidad, direccion, hijoDe, lugarNacimiento, sexo)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            guest.numeroDocumento,
                            guest.fechaNacimiento,
                            guest.fechaCaducidad,
                            guest.fechaEmision,
                            guest.nacionalidad,
                            guest.direccion,
                            guest.hijoDe,
                            guest.lugarNacimiento,
                            guest.sexo,
                        ]
                    );
                } else {
                    // Actualizar los datos del huésped si ya existe
                    await connection.query(
                        `UPDATE Huesped
                         SET fechaNacimiento = ?, fechaCaducidad = ?, fechaEmision = ?, nacionalidad = ?, direccion = ?, hijoDe = ?, lugarNacimiento = ?, sexo = ?
                         WHERE numeroDocumento = ?`,
                        [
                            guest.fechaNacimiento,
                            guest.fechaCaducidad,
                            guest.fechaEmision,
                            guest.nacionalidad,
                            guest.direccion,
                            guest.hijoDe,
                            guest.lugarNacimiento,
                            guest.sexo,
                            guest.numeroDocumento,
                        ]
                    );
                }

                // Verificar si la relación huésped-habitación ya existe
                const [existingHuespedHabitacion] = await connection.query(
                    `SELECT numeroDocumento FROM HuespedHabitacion WHERE numeroDocumento = ? AND idReserva = ? AND numHabitacion = ?`,
                    [guest.numeroDocumento, idReserva, numHabitacion]
                );

                if (existingHuespedHabitacion.length === 0) {
                    // Asignar huésped a la habitación si la relación no existe
                    await connection.query(
                        `INSERT INTO HuespedHabitacion (numeroDocumento, idReserva, numHabitacion)
                         VALUES (?, ?, ?)`,
                        [guest.numeroDocumento, idReserva, numHabitacion]
                    );
                }

                // Actualizar el estado de la habitación a "Ocupada"
                const queryUpdateRoomState = `
                    UPDATE Habitacion
                    SET estado = 'Ocupada'
                    WHERE numHabitacion = ?;
                `;
                await connection.query(queryUpdateRoomState, [numHabitacion]);

                // Actualizar el estado de la reserva a "En_curso"
                const queryUpdateReservationState = `
                    UPDATE Reserva
                    SET estado = 'En_curso'
                    WHERE idReserva = ?;
                `;
                await connection.query(queryUpdateReservationState, [idReserva]);
            }

            await connection.commit();
            connection.release();

            res.json({ message: "Huéspedes registrados y asignados a la habitación correctamente." });

            const io = req.app.get("io");
            io.emit("actualizarReservas");
            io.emit('actualizarHabitaciones');
            io.emit("actualizarHuespedes");

        } catch (error) {
            console.error("Error al registrar los huéspedes:", error);
            res.status(500);
        }
    }

    static async getGuestsByRoom(req, res) {
        const { numHabitacion } = req.params;

        try {
            const query = `
            SELECT 
              hh.numHabitacion,
              p.nombre,
              p.apellidos,
              p.numeroDocumento
            FROM 
              HuespedHabitacion hh
            JOIN 
              Persona p ON hh.numeroDocumento = p.numeroDocumento
            WHERE 
              hh.numHabitacion = ?;
          `;

            const [rows] = await pool.query(query, [numHabitacion]);

            res.json(rows);
        } catch (error) {
            console.error("Error al obtener los huéspedes de la habitación:", error);
            res.status(500).json({ error: "Error al obtener los huéspedes de la habitación." });
        }
    }




}

export default Guests;
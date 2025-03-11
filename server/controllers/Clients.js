import pool from '../config/db.js';

class Clients {

  static async getGuests(req, res) {
    try {
      const guestsQuery = `
            SELECT 
                p.numeroDocumento,
                p.tipoDocumento,
                p.nombre,
                p.apellidos,
                h.fechaNacimiento,
                h.nacionalidad,
                h.direccion,
                h.hijoDe,
                h.lugarNacimiento,
                h.sexo
            FROM Persona p
            JOIN Huesped h ON p.numeroDocumento = h.numeroDocumento;
        `;

      const [guests] = await pool.query(guestsQuery);
      res.json(guests);
    } catch (error) {
      console.error("Error al obtener los huéspedes:", error);
      res.status(500).json({ error: "Error al obtener los huéspedes." });
    }
  }

  static async getCorporateClients(req, res) {
    try {
      const corporateClientsQuery = `
            SELECT 
              NIF, 
              razonSocial, 
              nombreComercial, 
              direccionFiscal, 
              codigoPostal
            FROM EmpresaAgencia;
          `;

      const [corporateClients] = await pool.query(corporateClientsQuery);
      res.json(corporateClients);
    } catch (error) {
      console.error("Error al obtener las empresas/agencias:", error);
      res.status(500).json({ error: "Error al obtener las empresas/agencias." });
    }
  }

  static async getGuestDetails(req, res) {
    const { numeroDocumento } = req.params; // ID del huésped (número de documento)
    try {
      const query = `
        SELECT 
          p.numeroDocumento,
          p.tipoDocumento,
          p.nombre,
          p.apellidos,
          h.fechaNacimiento,
          h.nacionalidad,
          h.direccion,
          h.hijoDe,
          h.lugarNacimiento,
          h.sexo
        FROM Persona p
        JOIN Huesped h ON p.numeroDocumento = h.numeroDocumento
        WHERE p.numeroDocumento = ?;
      `;

      const [guestDetails] = await pool.query(query, [numeroDocumento]);

      if (guestDetails.length === 0) {
        return res.status(404).json({ error: "Huésped no encontrado." });
      }

      res.json(guestDetails[0]);
    } catch (error) {
      console.error("Error al obtener los detalles del huésped:", error);
      res.status(500).json({ error: "Error al obtener los detalles del huésped." });
    }
  }

  static async getGuestReservations(req, res) {
    const { numeroDocumento } = req.params; // Número de documento del huésped
    try {
      const query = `
        SELECT 
          r.idReserva,
          r.fechaEntrada,
          r.fechaSalida,
          hh.numHabitacion
        FROM HuespedHabitacion hh
        JOIN Reserva r ON hh.idReserva = r.idReserva
        JOIN Facturas f ON r.idReserva = f.idReserva
        WHERE hh.numeroDocumento = ?;
      `;

      const [reservations] = await pool.query(query, [numeroDocumento]);

      // Mapear y estructurar los datos
      const reservationsWithDetails = reservations.map((reservation) => ({
        idReserva: reservation.idReserva,
        fechaEntrada: reservation.fechaEntrada,
        fechaSalida: reservation.fechaSalida,
        numHabitacion: reservation.numHabitacion,
      }));

      res.json(reservationsWithDetails);
    } catch (error) {
      console.error("Error al obtener el historial de reservas del huésped:", error);
      res.status(500).json({ error: "Error al obtener el historial de reservas." });
    }
  }

  static async getCorporateDetails(req, res) {
    const { NIF } = req.params;
    try {
      const query = `
        SELECT 
          NIF, 
          razonSocial, 
          nombreComercial, 
          direccionFiscal, 
          codigoPostal
        FROM EmpresaAgencia
        WHERE NIF = ?;
      `;

      const [corporateDetails] = await pool.query(query, [NIF]);

      if (corporateDetails.length === 0) {
        return res.status(404).json({ error: "Empresa/Agencia no encontrada." });
      }

      res.json(corporateDetails[0]);
    } catch (error) {
      console.error("Error al obtener los detalles de la empresa/agencia:", error);
      res.status(500).json({ error: "Error al obtener los detalles de la empresa/agencia." });
    }
  }


  static async addParticular(req, res) {
    const {
      numeroDocumento,
      tipoDocumento,
      nombre,
      apellidos,
      fechaNacimiento,
      fechaCaducidad,
      fechaEmision,
      nacionalidad,
      direccion,
      hijoDe,
      lugarNacimiento,
      sexo
    } = req.body;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insertar en la tabla Persona si no existe
      const [existingPerson] = await connection.query(
        "SELECT numeroDocumento FROM Persona WHERE numeroDocumento = ?",
        [numeroDocumento]
      );

      if (existingPerson.length === 0) {
        await connection.query(
          "INSERT INTO Persona (numeroDocumento, tipoDocumento, nombre, apellidos) VALUES (?, ?, ?, ?)",
          [numeroDocumento, tipoDocumento, nombre, apellidos]
        );
      }

      // Insertar en la tabla Huesped
      await connection.query(
        `INSERT INTO Huesped (numeroDocumento, fechaNacimiento, fechaCaducidad, fechaEmision, nacionalidad, direccion, hijoDe, lugarNacimiento, sexo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [numeroDocumento, fechaNacimiento, fechaCaducidad, fechaEmision, nacionalidad, direccion, hijoDe, lugarNacimiento, sexo]
      );

      await connection.commit();
      res.status(201).json({ message: "Huésped registrado correctamente." });

      const io = req.app.get("io");
      io.emit("actualizarHuespedes");
    } catch (error) {
      await connection.rollback();
      console.error("Error al registrar huésped:", error);
      res.status(500);
    } finally {
      connection.release();
    }
  }

  static async addCorporate(req, res) {
    const { NIF, razonSocial, nombreComercial, direccionFiscal, codigoPostal } = req.body;

    try {
      const [existingCorporate] = await pool.query(
        "SELECT NIF FROM EmpresaAgencia WHERE NIF = ?",
        [NIF]
      );

      if (existingCorporate.length > 0) {
        return res.status(400).json({ error: "La empresa/agencia ya existe." });
      }

      await pool.query(
        `INSERT INTO EmpresaAgencia (NIF, razonSocial, nombreComercial, direccionFiscal, codigoPostal) 
             VALUES (?, ?, ?, ?, ?)`,
        [NIF, razonSocial, nombreComercial, direccionFiscal, codigoPostal]
      );

      res.status(201).json({ message: "Empresa/Agencia registrada correctamente." });

      const io = req.app.get("io");
      io.emit("actualizarHuespedes");
    } catch (error) {
      console.error("Error al registrar empresa/agencia:", error);
      res.status(500);
    }
  }

  static async updateParticular(req, res) {
    const { numeroDocumento, tipoDocumento, nombre, apellidos, fechaNacimiento,
      fechaEmision, fechaCaducidad, nacionalidad, direccion, hijoDe,
      lugarNacimiento, sexo } = req.body;

    if (!numeroDocumento) {
      return res.status(400).json({ success: false, message: "Número de documento es obligatorio." });
    }

    let conn;

    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // Actualizar en la tabla Persona
      await conn.query(`
            UPDATE Persona
            SET tipoDocumento = ?, nombre = ?, apellidos = ?
            WHERE numeroDocumento = ?`,
        [tipoDocumento, nombre, apellidos, numeroDocumento]);

      const fechaNacimientoFormatted = fechaNacimiento ? new Date(fechaNacimiento).toISOString().split("T")[0] : null;
      const fechaEmisionFormatted = fechaEmision ? new Date(fechaEmision).toISOString().split("T")[0] : null;
      const fechaCaducidadFormatted = fechaCaducidad ? new Date(fechaCaducidad).toISOString().split("T")[0] : null;

      // Actualizar en la tabla Huesped
      await conn.query(`
        UPDATE Huesped
        SET fechaNacimiento = ?, fechaEmision = ?, fechaCaducidad = ?, 
            nacionalidad = ?, direccion = ?, hijoDe = ?, 
            lugarNacimiento = ?, sexo = ?
        WHERE numeroDocumento = ?`,
        [fechaNacimientoFormatted, fechaEmisionFormatted, fechaCaducidadFormatted, nacionalidad,
          direccion, hijoDe, lugarNacimiento, sexo, numeroDocumento]);

      await conn.commit();
      conn.release();

      res.status(200).json({ success: true, message: "Huésped actualizado correctamente." });

      const io = req.app.get("io");
      io.emit("actualizarHuespedes");
    } catch (error) {
      if (conn) {
        await conn.rollback();
        conn.release();
      }
      console.error("Error al actualizar el huésped:", error);
      res.status(500);
    }
  }


  static async updateCompany(req, res) {
    const { NIF, razonSocial, nombreComercial, direccionFiscal, codigoPostal } = req.body;

    if (!NIF) {
      return res.status(400).json({ success: false, message: "NIF es obligatorio." });
    }

    let conn;

    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // Actualizar en la tabla EmpresaAgencia
      await conn.query(`
            UPDATE EmpresaAgencia
            SET razonSocial = ?, nombreComercial = ?, direccionFiscal = ?, codigoPostal = ?
            WHERE NIF = ?`,
        [razonSocial, nombreComercial, direccionFiscal, codigoPostal, NIF]);

      await conn.commit();
      conn.release();

      res.status(200).json({ success: true, message: "Empresa/Agencia actualizada correctamente." });

      const io = req.app.get("io");
      io.emit("actualizarHuespedes");
    } catch (error) {
      if (conn) {
        await conn.rollback();
        conn.release();
      }
      console.error("Error al actualizar la empresa/agencia:", error);
      res.status(500);
    }
  }



}


export default Clients;
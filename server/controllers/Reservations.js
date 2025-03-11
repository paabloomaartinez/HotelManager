import { Resend } from 'resend';
import pool from '../config/db.js';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';
import puppeteer from "puppeteer";

dotenv.config({ path: '../.env' });

const __dirname = dirname(fileURLToPath(import.meta.url));

const resend = new Resend(process.env.RESEND_API_KEY);

class Reservations {

  static async getAllReservations(req, res) {
    try {
      const query = `
        SELECT 
          r.idReserva AS idReserva,
          r.fechaEntrada AS fechaEntrada,
          r.fechaSalida AS fechaSalida,
          r.numPersonas AS numPersonas,
          r.precio AS precio,
          r.estado AS estado,
          h.numHabitacion AS numHabitacion,
          c.nombre AS clienteNombre,
          c.apellidos AS clienteApellidos
        FROM Reserva r
        JOIN HabitacionReservada hr ON r.idReserva = hr.idReserva
        JOIN Cliente c ON r.idCliente = c.idCliente
        JOIN Habitacion h ON hr.numHabitacion = h.numHabitacion
        WHERE r.estado != "Cancelada"
        ORDER BY r.fechaEntrada, h.numHabitacion;
      `;

      const [reservations] = await pool.query(query);

      // Transformar los datos si es necesario (por ejemplo, formato de fecha)
      const formattedReservations = reservations.map((reservation) => ({
        idReserva: reservation.idReserva,
        fechaEntrada: reservation.fechaEntrada,
        fechaSalida: reservation.fechaSalida,
        numPersonas: reservation.numPersonas,
        precio: reservation.precio,
        estado: reservation.estado,
        numHabitacion: reservation.numHabitacion,
        clienteNombre: `${reservation.clienteNombre} ${reservation.clienteApellidos}`,
      }));

      res.status(200).json(formattedReservations);
    } catch (error) {
      console.error('Error al obtener las reservas:', error);
      res.status(500).json({ error: 'Error al obtener las reservas' });
    }
  }

  static async getAvailableRoomsOnRange(req, res) {
    const { roomType, checkInDate, checkOutDate, services } = req.body;

    try {
      // Validar fechas
      if (!checkInDate || !checkOutDate) {
        return res.status(400).json({ error: "Las fechas de entrada y salida son obligatorias" });
      }

      // Construir la consulta
      const query = `
        SELECT 
          h.numHabitacion AS Numero, 
          h.numCamas AS Num_camas,
          h.tipo AS Tipo,
          tr.precio AS Tarifa
        FROM habitacion h 
        JOIN aplica a ON h.numHabitacion = a.numHabitacion
        JOIN tarifa tr ON a.idTarifa = tr.idTarifa
        WHERE h.estado != "Fuera de Servicio" AND h.estado != "Bloqueada" AND
          (1 = 1)
          ${roomType ? "AND h.tipo = ?" : ""}
          AND h.numHabitacion NOT IN (
            SELECT numHabitacion 
            FROM habitacionreservada
            JOIN reserva r ON habitacionreservada.idReserva = r.idReserva
            WHERE r.estado = 'Activa' AND r.estado = "En_curso" AND (habitacionreservada.fechaEntrada <= ? AND habitacionreservada.fechaSalida >= ?)
          )
          ${services.includes("Supletoria") ? "AND h.opcionSupletoria = TRUE" : ""}
        ORDER BY ${roomType ? "" : "h.tipo,"} h.numHabitacion ASC;
      `;

      const params = [
        ...(roomType ? [roomType] : []),
        checkOutDate,
        checkInDate,
      ];

      // Ejecutar consulta
      const [rows] = await pool.query(query, params);

      res.status(200).json(rows);
    } catch (error) {
      console.error("Error al buscar habitaciones disponibles:", error);
      res.status(500).json({ error: "Error al buscar habitaciones disponibles" });
    }
  }


  static async createReservation(req, res) {
    const {
      client,
      checkInDate,
      checkOutDate,
      numGuests,
      price,
      selectedRooms,
      selectedServices,
      notes,
    } = req.body;

    const [nombre, ...apellidos] = client.fullName.split(" ");
    const apellidoCompleto = apellidos.join(" ");

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Verificar si el cliente ya existe o crearlo
      let clientId;
      const [clientRows] = await connection.query(
        `SELECT idCliente FROM Cliente WHERE nombre = ? AND apellidos = ? AND correo = ?`,
        [nombre, apellidoCompleto, client.email]
      );

      if (clientRows.length > 0) {
        clientId = clientRows[0].idCliente;
      } else {
        const [result] = await connection.query(
          `INSERT INTO Cliente (nombre, apellidos, correo, telefono) 
           VALUES (?, ?, ?, ?)`,
          [nombre, apellidoCompleto, client.email, client.phone]
        );
        clientId = result.insertId;
      }

      // Crear la reserva
      const [reservationResult] = await connection.query(
        `INSERT INTO Reserva (fechaEntrada, fechaSalida, numPersonas, precio, estado, notas, idCliente) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [checkInDate, checkOutDate, numGuests, price, "Activa", notes, clientId]
      );
      const reservationId = reservationResult.insertId;

      // Asignar habitaciones a la reserva
      for (const room of selectedRooms) {
        await connection.query(
          `INSERT INTO HabitacionReservada (idReserva, numHabitacion, fechaEntrada, fechaSalida, opcionSupletoria) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            reservationId,
            room.Numero,
            checkInDate,
            checkOutDate,
            room.opcionSupletoria || false,
          ]
        );
      }

      // Asignar servicios a la reserva
      for (const service of selectedServices) {
        const serviceId = service === "Parking" ? 1 : service === "Desayuno" ? 2 : service === "Supletoria" ? 3 : null;
        if (serviceId) {
          await connection.query(
            `INSERT INTO Anade (idReserva, idServicio) VALUES (?, ?)`,
            [reservationId, serviceId]
          );
        }
      }

      await connection.commit();
      res.status(201).json({ message: "Reserva creada con éxito" });

      const io = req.app.get("io");
      io.emit("actualizarReservas");

      // Enviar correo de confirmación
      try {
        const reservationLink = `${process.env.FRONTEND_BASE_URL}/reservations/${reservationId}`;
        const emailContent = `
          <h1>Confirmación de Reserva</h1>
          <div style="
              border: 2px solid #3498db; 
              border-radius: 8px; 
              padding: 10px 15px; 
              margin: 20px 0; 
              background-color: #f1f8ff; 
              text-align: center; 
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="
                font-size: 20px; 
                color: #3498db; 
                margin: 0;">Localizador:</h2>
            <p style="
                font-size: 24px; 
                font-weight: bold; 
                color: #333; 
                text-decoration: underline blue;
                margin: 5px 0;"><a href="${reservationLink}" target="_blank">${reservationId}</p>
          </div>
          <p>Hola, ${nombre} ${apellidoCompleto},</p>
          <p>Gracias por realizar tu reserva con nosotros. Aquí tienes los detalles de tu reserva:</p>
          <ul>
            <li><strong>Localizador:</strong> ${reservationId}</li>
            <li><strong>Fecha de Entrada:</strong> ${checkInDate}</li>
            <li><strong>Fecha de Salida:</strong> ${checkOutDate}</li>
            <li><strong>Número de Personas:</strong> ${numGuests}</li>
            <li><strong>Habitaciones:</strong> ${selectedRooms.map((r) => r.Numero).join(", ")}</li>
            ${selectedServices.length > 0 ? `<li><strong>Servicios:</strong> ${selectedServices.join(", ")}</li>` : ""}
            ${notes ? `<li><strong>Notas Especiales:</strong> ${notes}</li>` : ""}
            <li><strong>Precio Total:</strong> €${price.toFixed(2)}</li>
          </ul>
          <p>Puedes ver los detalles de tu reserva en cualquier momento haciendo clic en el siguiente enlace:</p>
          <p><a href="${reservationLink}" target="_blank">Ver mi reserva</a></p>
          <p>Además, puedes completar el pago de tu reserva de forma rápida y segura.</p>
          <p>¡Te esperamos!</p>
        `;

        await resend.emails.send({
          from: 'Hotel <hotel@pmartinez.eus>',
          to: [client.email],
          subject: 'Confirmación de tu Reserva',
          html: emailContent,
        })

        console.log("correo enviado");

      } catch (emailError) {
        console.error("Error al enviar el correo de confirmación:", emailError);
      }
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al crear la reserva:", error);
      res.status(500).json({ error: "Error al crear la reserva" });
    } finally {
      if (connection) connection.release();
    }
  }

  static async getReservationDetails(req, res) {
    try {
      const query = `
        SELECT 
          r.idReserva AS idReserva,
          r.fechaEntrada AS fechaEntrada,
          r.fechaSalida AS fechaSalida,
          r.numPersonas AS numPersonas,
          r.precio AS precio,
          r.estado AS estado,
          h.numHabitacion AS numHabitacion,
          h.tipo AS tipoHabitacion,
          c.nombre AS clienteNombre,
          c.apellidos AS clienteApellidos,
          s.nombreServicio AS servicioNombre
        FROM Reserva r
        JOIN HabitacionReservada hr ON r.idReserva = hr.idReserva
        JOIN Cliente c ON r.idCliente = c.idCliente
        JOIN Habitacion h ON hr.numHabitacion = h.numHabitacion
        LEFT JOIN Anade a ON r.idReserva = a.idReserva
        LEFT JOIN Servicio s ON a.idServicio = s.idServicio
        WHERE r.idReserva = ?
        ORDER BY r.fechaEntrada, h.numHabitacion;
      `;

      const [reservations] = await pool.query(query, [req.params.id]);

      if (reservations.length === 0) {
        return res.status(404).json({ message: 'Reserva no encontrada' });
      }

      // Agrupar las habitaciones y servicios en un solo objeto de reserva
      const reservationDetails = reservations.reduce((acc, curr) => {
        if (!acc) {
          acc = {
            idReserva: curr.idReserva,
            fechaEntrada: curr.fechaEntrada,
            fechaSalida: curr.fechaSalida,
            numPersonas: curr.numPersonas,
            precio: curr.precio,
            estado: curr.estado,
            clienteNombre: `${curr.clienteNombre} ${curr.clienteApellidos}`,
            habitaciones: [],
            servicios: [],
          };
        }
        if (!acc.habitaciones.some(h => h.numHabitacion === curr.numHabitacion)) {
          acc.habitaciones.push({ numHabitacion: curr.numHabitacion, tipoHabitacion: curr.tipoHabitacion });
        }
        if (curr.servicioNombre && !acc.servicios.includes(curr.servicioNombre)) {
          acc.servicios.push(curr.servicioNombre);
        }
        return acc;
      }, null);

      res.status(200).json(reservationDetails);
    } catch (error) {
      console.error('Error al obtener los detalles de la reserva:', error);
      res.status(500).json({ error: 'Error interno al obtener los detalles de la reserva' });
    }
  }

  static async updateReservationDays(req, res) {
    const { idReserva, checkInDate, checkOutDate } = req.body;

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Verificar si las fechas son diferentes
      const [existingReservation] = await connection.query(
        `SELECT fechaEntrada, fechaSalida, numPersonas, idCliente FROM Reserva WHERE idReserva = ?`,
        [idReserva]
      );

      if (!existingReservation.length) {
        throw new Error("La reserva no existe.");
      }

      const { fechaEntrada, fechaSalida, numPersonas, idCliente } = existingReservation[0];

      if (fechaEntrada === checkInDate && fechaSalida === checkOutDate) {
        return res.status(400).json({ error: "Las fechas de entrada y salida son iguales a las actuales." });
      }

      // Obtener habitaciones reservadas con sus tarifas
      const [roomsWithRates] = await connection.query(
        `SELECT hr.numHabitacion, t.precio AS tarifa
         FROM HabitacionReservada hr
         JOIN Aplica a ON hr.numHabitacion = a.numHabitacion
         JOIN Tarifa t ON a.idTarifa = t.idTarifa
         WHERE hr.idReserva = ?`,
        [idReserva]
      );

      if (!roomsWithRates.length) {
        throw new Error("No se encontraron habitaciones asociadas a la reserva.");
      }

      // Obtener servicios asociados
      const [services] = await connection.query(
        `SELECT s.nombreServicio AS servicio
         FROM Anade a
         JOIN Servicio s ON a.idServicio = s.idServicio
         WHERE a.idReserva = ?`,
        [idReserva]
      );

      // Calcular el nuevo precio usando la función `calculateReservationPrice`
      const selectedRooms = roomsWithRates.map((room) => ({ tarifa: room.tarifa }));
      const selectedServices = services.map((service) => service.servicio);
      const newPrice = Reservations.calculateReservationPrice(
        checkInDate,
        checkOutDate,
        numPersonas,
        selectedRooms,
        selectedServices
      );

      // Verificar disponibilidad de habitaciones para las nuevas fechas
      const [conflictingRooms] = await connection.query(
        `SELECT hr.numHabitacion
         FROM HabitacionReservada hr
         JOIN Reserva r ON hr.idReserva = r.idReserva
         WHERE hr.numHabitacion IN (
           SELECT numHabitacion FROM HabitacionReservada WHERE idReserva = ?
         )
         AND r.estado = 'Activa'
         AND r.idReserva != ?
         AND (hr.fechaEntrada <= ? AND hr.fechaSalida >= ?)`,
        [idReserva, idReserva, checkOutDate, checkInDate]
      );

      if (conflictingRooms.length) {
        return res.status(400).json({
          error: "Una o más habitaciones reservadas no están disponibles para las nuevas fechas.",
        });
      }

      // Actualizar fechas y precio en la reserva
      await connection.query(
        `UPDATE Reserva
         SET fechaEntrada = ?, fechaSalida = ?, precio = ?
         WHERE idReserva = ?`,
        [checkInDate, checkOutDate, newPrice, idReserva]
      );

      // Actualizar las fechas en HabitacionReservada
      await connection.query(
        `UPDATE HabitacionReservada
         SET fechaEntrada = ?, fechaSalida = ?
         WHERE idReserva = ?`,
        [checkInDate, checkOutDate, idReserva]
      );

      // Obtener datos del cliente para enviar el correo
      const [clientData] = await connection.query(
        `SELECT nombre, apellidos, correo FROM Cliente WHERE idCliente = ?`,
        [idCliente]
      );

      const cliente = clientData[0];
      if (!cliente) {
        throw new Error("No se pudo encontrar la información del cliente.");
      }

      await connection.commit();

      const io = req.app.get("io");
      io.emit("actualizarReservas");

      // Enviar correo de confirmación
      try {
        const reservationLink = `${process.env.FRONTEND_BASE_URL}/reservations/${idReserva}`;
        const emailContent = `
          <h1>Confirmación de Modificación de Reserva</h1>
          <p>Hola, ${cliente.nombre} ${cliente.apellidos},</p>
          <p>Te informamos que las fechas de tu reserva han sido modificadas con éxito. Aquí tienes los detalles actualizados:</p>
          <ul>
            <li><strong>Localizador:</strong> ${idReserva}</li>
            <li><strong>Fechas Anteriores:</strong> ${new Date(fechaEntrada).toLocaleDateString()} - ${new Date(fechaSalida).toLocaleDateString()}</li>
            <li><strong>Fechas Nuevas:</strong> ${new Date(checkInDate).toLocaleDateString()} - ${new Date(checkOutDate).toLocaleDateString()}</li>
            <li><strong>Nuevo Precio Total:</strong> €${newPrice.toFixed(2)}</li>
          </ul>
          <p>Puedes ver los detalles de tu reserva haciendo clic en el siguiente enlace:</p>
          <p><a href="${reservationLink}" target="_blank">Ver mi reserva</a></p>
          <p>Gracias por elegir nuestro servicio.</p>
        `;

        await resend.emails.send({
          from: "Hotel <hotel@pmartinez.eus>",
          to: [cliente.correo],
          subject: "Confirmación de Modificación de Reserva",
          html: emailContent,
        });
      } catch (emailError) {
        console.error("Error al enviar el correo de confirmación:", emailError);
      }

      res.status(200).json({ message: "Reserva actualizada con éxito.", newPrice });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al actualizar la reserva:", error);
      res.status(500).json({ error: "Error interno al actualizar la reserva." });
    } finally {
      if (connection) connection.release();
    }
  }

  static async updateReservationServices(req, res) {
    const { idReserva, newServices } = req.body;

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Verificar si la reserva existe
      const [existingReservation] = await connection.query(
        `SELECT fechaEntrada, fechaSalida, numPersonas, idCliente FROM Reserva WHERE idReserva = ?`,
        [idReserva]
      );

      if (!existingReservation.length) {
        throw new Error("La reserva no existe.");
      }

      const { fechaEntrada, fechaSalida, numPersonas, idCliente } = existingReservation[0];

      // Mapear los servicios seleccionados a sus IDs
      const newServiceIds = newServices
        .map((service) => (service === "Parking" ? 1 : service === "Desayuno" ? 2 : service === "Supletoria" ? 3 : null))
        .filter((id) => id !== null);

      // Si el servicio "Cama Supletoria" está seleccionado, verificar compatibilidad
      if (newServiceIds.includes(3)) {
        const [reservedRooms] = await connection.query(
          `SELECT hr.numHabitacion, h.opcionSupletoria
           FROM HabitacionReservada hr
           JOIN Habitacion h ON hr.numHabitacion = h.numHabitacion
           WHERE hr.idReserva = ?`,
          [idReserva]
        );

        const roomsWithoutSupletoria = reservedRooms.filter((room) => !room.opcionSupletoria);

        if (roomsWithoutSupletoria.length > 0) {
          const roomNumbers = roomsWithoutSupletoria.map((room) => room.numHabitacion).join(", ");
          return res.status(400).json({
            error: `Las siguientes habitaciones no permiten camas supletorias: ${roomNumbers}`,
          });
        }
      }

      // Obtener los servicios actuales asociados a la reserva
      const [currentServices] = await connection.query(
        `SELECT idServicio FROM Anade WHERE idReserva = ?`,
        [idReserva]
      );

      const currentServiceIds = currentServices.map((service) => service.idServicio).sort();

      // Comparar los arrays de servicios
      if (JSON.stringify(currentServiceIds) === JSON.stringify(newServiceIds.sort())) {
        return res.status(400).json({
          error: "Los servicios seleccionados son idénticos a los ya asociados a la reserva.",
        });
      }

      // Eliminar todos los servicios actuales
      await connection.query(`DELETE FROM Anade WHERE idReserva = ?`, [idReserva]);

      // Insertar los nuevos servicios
      for (const serviceId of newServiceIds) {
        await connection.query(
          `INSERT INTO Anade (idReserva, idServicio) VALUES (?, ?)`,
          [idReserva, serviceId]
        );
      }

      // Obtener las habitaciones asociadas a la reserva
      const [roomsWithRates] = await connection.query(
        `SELECT hr.numHabitacion, t.precio AS tarifa
         FROM HabitacionReservada hr
         JOIN Aplica a ON hr.numHabitacion = a.numHabitacion
         JOIN Tarifa t ON a.idTarifa = t.idTarifa
         WHERE hr.idReserva = ?`,
        [idReserva]
      );

      if (!roomsWithRates.length) {
        throw new Error("No se encontraron habitaciones asociadas a la reserva.");
      }

      // Recalcular el precio total usando la función `calculateReservationPrice`
      const selectedRooms = roomsWithRates.map((room) => ({ tarifa: room.tarifa }));
      const selectedServices = newServices;
      const newPrice = Reservations.calculateReservationPrice(
        fechaEntrada,
        fechaSalida,
        numPersonas,
        selectedRooms,
        selectedServices
      );

      // Actualizar el precio de la reserva
      await connection.query(
        `UPDATE Reserva SET precio = ? WHERE idReserva = ?`,
        [newPrice, idReserva]
      );

      await connection.commit();

      // Obtener los datos del cliente para enviar el correo
      const [clientData] = await connection.query(
        `SELECT nombre, apellidos, correo FROM Cliente WHERE idCliente = ?`,
        [idCliente]
      );

      const cliente = clientData[0];
      if (!cliente) {
        throw new Error("No se pudo encontrar la información del cliente.");
      }

      const io = req.app.get("io");
      io.emit("actualizarReservas");

      // Enviar correo de confirmación
      try {
        const reservationLink = `${process.env.FRONTEND_BASE_URL}/reservations/${idReserva}`;
        const emailContent = `
          <h1>Confirmación de Modificación de Servicios</h1>
          <p>Hola, ${cliente.nombre} ${cliente.apellidos},</p>
          <p>Te informamos que los servicios de tu reserva han sido modificados con éxito. Aquí tienes los detalles actualizados:</p>
          <ul>
            <li><strong>Localizador:</strong> ${idReserva}</li>
            <li><strong>Fechas:</strong> ${new Date(fechaEntrada).toLocaleDateString()} - ${new Date(fechaSalida).toLocaleDateString()}</li>
            <li><strong>Número de Personas:</strong> ${numPersonas}</li>
            <li><strong>Servicios Nuevos:</strong> ${newServices.join(", ")}</li>
            <li><strong>Nuevo Precio Total:</strong> €${newPrice.toFixed(2)}</li>
          </ul>
          <p>Puedes ver los detalles de tu reserva haciendo clic en el siguiente enlace:</p>
          <p><a href="${reservationLink}" target="_blank">Ver mi reserva</a></p>
          <p>Gracias por elegir nuestro servicio.</p>
        `;

        await resend.emails.send({
          from: "Hotel <hotel@pmartinez.eus>",
          to: [cliente.correo],
          subject: "Confirmación de Modificación de Servicios",
          html: emailContent,
        });
      } catch (emailError) {
        console.error("Error al enviar el correo de confirmación:", emailError);
      }

      res.status(200).json({ message: "Servicios actualizados con éxito.", newPrice });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al actualizar los servicios de la reserva:", error);
      res.status(500).json({ error: "Error interno al actualizar los servicios de la reserva." });
    } finally {
      if (connection) connection.release();
    }
  }

  static async updateReservationRooms(req, res) {
    const { idReserva, selectedRooms } = req.body;

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Verificar si la reserva existe
      const [existingReservation] = await connection.query(
        `SELECT fechaEntrada, fechaSalida, numPersonas, idCliente FROM Reserva WHERE idReserva = ?`,
        [idReserva]
      );

      if (!existingReservation.length) {
        throw new Error("La reserva no existe.");
      }

      const { fechaEntrada, fechaSalida, numPersonas, idCliente } = existingReservation[0];

      // Obtener habitaciones actualmente reservadas
      const [currentRooms] = await connection.query(
        `SELECT numHabitacion FROM HabitacionReservada WHERE idReserva = ?`,
        [idReserva]
      );

      const currentRoomNumbers = currentRooms.map((room) => room.numHabitacion);

      // Comparar las habitaciones actuales con las seleccionadas
      const selectedRoomNumbers = selectedRooms.map((room) => room.Numero);
      selectedRoomNumbers.sort();
      currentRoomNumbers.sort();

      if (JSON.stringify(currentRoomNumbers) === JSON.stringify(selectedRoomNumbers)) {
        return res.status(400).json({
          error: "Las habitaciones seleccionadas son idénticas a las ya reservadas.",
        });
      }

      // Verificar disponibilidad de las nuevas habitaciones en las fechas de la reserva
      const [conflictingRooms] = await connection.query(
        `
          SELECT hr.numHabitacion
          FROM HabitacionReservada hr
          JOIN Reserva r ON hr.idReserva = r.idReserva
          WHERE hr.numHabitacion IN (?)
          AND r.estado = 'Activa'
          AND r.idReserva != ?
          AND (hr.fechaEntrada <= ? AND hr.fechaSalida >= ?)
        `,
        [selectedRoomNumbers, idReserva, fechaSalida, fechaEntrada]
      );

      if (conflictingRooms.length) {
        const conflictingRoomNumbers = conflictingRooms.map((room) => room.numHabitacion).join(", ");
        return res.status(400).json({
          error: `Las siguientes habitaciones no están disponibles: ${conflictingRoomNumbers}`,
        });
      }

      // Eliminar habitaciones actualmente reservadas
      await connection.query(`DELETE FROM HabitacionReservada WHERE idReserva = ?`, [idReserva]);

      // Insertar las nuevas habitaciones seleccionadas
      for (const room of selectedRooms) {
        await connection.query(
          `INSERT INTO HabitacionReservada (idReserva, numHabitacion, fechaEntrada, fechaSalida) VALUES (?, ?, ?, ?)`,
          [idReserva, room.Numero, fechaEntrada, fechaSalida]
        );
      }

      // Obtener tarifas de las habitaciones seleccionadas
      const selectedRoomRates = selectedRooms.map((room) => ({ tarifa: room.Tarifa }));

      // Obtener servicios asociados a la reserva
      const [services] = await connection.query(
        `
          SELECT s.nombreServicio AS servicio
          FROM Anade a
          JOIN Servicio s ON a.idServicio = s.idServicio
          WHERE a.idReserva = ?
        `,
        [idReserva]
      );

      const selectedServices = services.map((service) => service.servicio);

      // Calcular el nuevo precio utilizando la función calculateReservationPrice
      const newPrice = Reservations.calculateReservationPrice(
        fechaEntrada,
        fechaSalida,
        numPersonas,
        selectedRoomRates,
        selectedServices
      );

      // Actualizar el precio de la reserva
      await connection.query(`UPDATE Reserva SET precio = ? WHERE idReserva = ?`, [newPrice, idReserva]);

      await connection.commit();

      // Obtener los datos del cliente para enviar el correo
      const [clientData] = await connection.query(
        `SELECT nombre, apellidos, correo FROM Cliente WHERE idCliente = ?`,
        [idCliente]
      );

      const cliente = clientData[0];
      if (!cliente) {
        throw new Error("No se pudo encontrar la información del cliente.");
      }

      const io = req.app.get("io");
      io.emit("actualizarReservas");

      // Enviar correo de confirmación
      try {
        const reservationLink = `${process.env.FRONTEND_BASE_URL}/reservations/${idReserva}`;
        const emailContent = `
          <h1>Confirmación de Modificación de Habitaciones</h1>
          <p>Hola, ${cliente.nombre} ${cliente.apellidos},</p>
          <p>Te informamos que las habitaciones de tu reserva han sido modificadas con éxito. Aquí tienes los detalles actualizados:</p>
          <ul>
            <li><strong>Localizador:</strong> ${idReserva}</li>
            <li><strong>Fechas:</strong> ${new Date(fechaEntrada).toLocaleDateString()} - ${new Date(fechaSalida).toLocaleDateString()}</li>
            <li><strong>Número de Personas:</strong> ${numPersonas}</li>
            <li><strong>Nuevas Habitaciones:</strong> ${selectedRooms
            .map((room) => `${room.Numero} (${room.Tipo})`)
            .join(", ")}</li>
            <li><strong>Nuevo Precio Total:</strong> €${newPrice.toFixed(2)}</li>
          </ul>
          <p>Puedes ver los detalles de tu reserva haciendo clic en el siguiente enlace:</p>
          <p><a href="${reservationLink}" target="_blank">Ver mi reserva</a></p>
          <p>Gracias por elegir nuestro servicio.</p>
        `;

        await resend.emails.send({
          from: "Hotel <hotel@pmartinez.eus>",
          to: [cliente.correo],
          subject: "Confirmación de Modificación de Habitaciones",
          html: emailContent,
        });
      } catch (emailError) {
        console.error("Error al enviar el correo de confirmación:", emailError);
      }

      res.status(200).json({ message: "Habitaciones actualizadas con éxito.", newPrice });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al actualizar las habitaciones de la reserva:", error);
      res.status(500).json({ error: "Error interno al actualizar las habitaciones de la reserva." });
    } finally {
      if (connection) connection.release();
    }
  }

  static async updateReservationPersons(req, res) {
    const { idReserva, numPersons } = req.body;

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Verificar si la reserva existe
      const [existingReservation] = await connection.query(
        `SELECT fechaEntrada, fechaSalida, numPersonas, idCliente FROM Reserva WHERE idReserva = ?`,
        [idReserva]
      );

      if (!existingReservation.length) {
        throw new Error("La reserva no existe.");
      }

      const { fechaEntrada, fechaSalida, numPersonas: currentNumPersons, idCliente } = existingReservation[0];

      // Validar si el número de personas es el mismo
      if (currentNumPersons === numPersons) {
        return res.status(400).json({
          error: "El número de personas es idéntico al actual.",
        });
      }

      // Obtener las habitaciones reservadas
      const [roomsWithRates] = await connection.query(
        `SELECT hr.numHabitacion, t.precio AS tarifa
         FROM HabitacionReservada hr
         JOIN Aplica a ON hr.numHabitacion = a.numHabitacion
         JOIN Tarifa t ON a.idTarifa = t.idTarifa
         WHERE hr.idReserva = ?`,
        [idReserva]
      );

      if (!roomsWithRates.length) {
        throw new Error("No se encontraron habitaciones asociadas a la reserva.");
      }

      // Obtener los servicios asociados a la reserva
      const [services] = await connection.query(
        `SELECT s.nombreServicio AS servicio
         FROM Anade a
         JOIN Servicio s ON a.idServicio = s.idServicio
         WHERE a.idReserva = ?`,
        [idReserva]
      );

      const selectedServices = services.map((service) => service.servicio);

      // Calcular el nuevo precio utilizando la función calculateReservationPrice
      const newPrice = Reservations.calculateReservationPrice(
        fechaEntrada,
        fechaSalida,
        numPersons,
        roomsWithRates,
        selectedServices
      );

      // Actualizar el número de personas y el precio en la reserva
      await connection.query(
        `UPDATE Reserva SET numPersonas = ?, precio = ? WHERE idReserva = ?`,
        [numPersons, newPrice, idReserva]
      );

      await connection.commit();

      // Obtener los datos del cliente para enviar el correo
      const [clientData] = await connection.query(
        `SELECT nombre, apellidos, correo FROM Cliente WHERE idCliente = ?`,
        [idCliente]
      );

      const cliente = clientData[0];
      if (!cliente) {
        throw new Error("No se pudo encontrar la información del cliente.");
      }

      const io = req.app.get("io");
      io.emit("actualizarReservas");

      // Enviar correo de confirmación
      try {
        const reservationLink = `${process.env.FRONTEND_BASE_URL}/reservations/${idReserva}`;
        const emailContent = `
          <h1>Confirmación de Modificación de Número de Personas</h1>
          <p>Hola, ${cliente.nombre} ${cliente.apellidos},</p>
          <p>Te informamos que el número de personas de tu reserva ha sido modificado con éxito. Aquí tienes los detalles actualizados:</p>
          <ul>
            <li><strong>Localizador:</strong> ${idReserva}</li>
            <li><strong>Fechas:</strong> ${new Date(fechaEntrada).toLocaleDateString()} - ${new Date(fechaSalida).toLocaleDateString()}</li>
            <li><strong>Número de Personas Anterior:</strong> ${currentNumPersons}</li>
            <li><strong>Número de Personas Nuevo:</strong> ${numPersons}</li>
            <li><strong>Nuevo Precio Total:</strong> €${newPrice.toFixed(2)}</li>
          </ul>
          <p>Puedes ver los detalles de tu reserva haciendo clic en el siguiente enlace:</p>
          <p><a href="${reservationLink}" target="_blank">Ver mi reserva</a></p>
          <p>Gracias por elegir nuestro servicio.</p>
        `;

        await resend.emails.send({
          from: "Hotel <hotel@pmartinez.eus>",
          to: [cliente.correo],
          subject: "Confirmación de Modificación de Número de Personas",
          html: emailContent,
        });
      } catch (emailError) {
        console.error("Error al enviar el correo de confirmación:", emailError);
      }

      res.status(200).json({ message: "Número de personas actualizado con éxito.", newPrice });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al actualizar el número de personas:", error);
      res.status(500).json({ error: "Error interno al actualizar el número de personas." });
    } finally {
      if (connection) connection.release();
    }
  }

  static async cancelReservation(req, res) {
    const { idReserva } = req.body;

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Verificar si la reserva existe
      const [existingReservation] = await connection.query(
        `SELECT idCliente, estado FROM Reserva WHERE idReserva = ?`,
        [idReserva]
      );

      if (!existingReservation.length) {
        return res.status(404).json({ error: "La reserva no existe." });
      }

      const { idCliente, estado } = existingReservation[0];

      // Verificar si la reserva ya está cancelada
      if (estado === "Cancelada") {
        return res.status(400).json({ error: "La reserva ya está cancelada." });
      }

      // Actualizar el estado de la reserva a "Cancelada"
      await connection.query(
        `UPDATE Reserva SET estado = 'Cancelada' WHERE idReserva = ?`,
        [idReserva]
      );

      await connection.commit();

      // Obtener los datos del cliente
      const [clientData] = await connection.query(
        `SELECT nombre, apellidos, correo FROM Cliente WHERE idCliente = ?`,
        [idCliente]
      );

      const cliente = clientData[0];
      if (!cliente) {
        throw new Error("No se pudo encontrar la información del cliente.");
      }

      const io = req.app.get("io");
      io.emit("actualizarReservas");

      // Enviar correo de confirmación
      try {
        const emailContent = `
                <h1>Confirmación de Cancelación de Reserva</h1>
                <p>Hola, ${cliente.nombre} ${cliente.apellidos},</p>
                <p>Te informamos que tu reserva con localizador <strong>${idReserva}</strong> ha sido cancelada con éxito.</p>
                <p>Si tienes alguna pregunta o deseas realizar una nueva reserva, no dudes en ponerte en contacto con nosotros.</p>
                <p>Gracias por elegir nuestro servicio.</p>
            `;

        await resend.emails.send({
          from: "Hotel <hotel@pmartinez.eus>",
          to: [cliente.correo],
          subject: "Confirmación de Cancelación de Reserva",
          html: emailContent,
        });
      } catch (emailError) {
        console.error("Error al enviar el correo de confirmación:", emailError);
      }

      res.status(200).json({ message: "Reserva cancelada con éxito." });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al cancelar la reserva:", error);
      res.status(500).json({ error: "Error interno al cancelar la reserva." });
    } finally {
      if (connection) connection.release();
    }
  }

  static calculateReservationPrice(checkInDate, checkOutDate, numGuests, selectedRooms, selectedServices) {
    const totalNights = (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24);
    let totalPrice = 0;

    // Calcular el precio de las habitaciones
    totalPrice += selectedRooms.reduce((acc, room) => acc + room.tarifa * totalNights, 0);

    // Calcular el costo de los servicios seleccionados
    for (const service of selectedServices) {
      if (service === "Parking") {
        totalPrice += totalNights * 10;
      } else if (service === "Desayuno") {
        totalPrice += totalNights * 15 * numGuests;
      } else if (service === "Supletoria") {
        totalPrice += totalNights * 25;
      }
    }

    return totalPrice;
  }

  static async todayCheckIns(req, res) {
    try {
      const query = `
        SELECT 
          r.idReserva, 
          r.fechaEntrada, 
          r.fechaSalida, 
          c.nombre AS clienteNombre, 
          c.apellidos AS clienteApellidos, 
          hr.numHabitacion
        FROM 
          Reserva r
        JOIN 
          Cliente c ON r.idCliente = c.idCliente
        JOIN 
          HabitacionReservada hr ON r.idReserva = hr.idReserva
        JOIN 
          habitacion h ON h.numHabitacion = hr.numHabitacion
        WHERE 
          r.fechaEntrada = CURDATE() AND h.estado = "Disponible" AND r.estado = "Activa"
      `;
      const [rows] = await pool.query(query);

      res.json(rows); // Devuelve directamente las filas
    } catch (error) {
      console.error("Error al obtener las reservas del día:", error);
      res.status(500).json({ error: "Error al obtener las reservas del día." });
    }
  }

  static async todayCheckOuts(req, res) {
    try {
      const query = `
        SELECT
          r.idReserva, 
          r.fechaEntrada, 
          r.fechaSalida, 
          c.nombre AS clienteNombre, 
          c.apellidos AS clienteApellidos,
          GROUP_CONCAT(hr.numHabitacion SEPARATOR ', ') AS habitaciones
        FROM Reserva r
        JOIN Cliente c ON r.idCliente = c.idCliente
        JOIN HabitacionReservada hr ON r.idReserva = hr.idReserva
        WHERE r.fechaSalida = CURDATE() AND r.estado = 'En_curso'
        GROUP BY r.idReserva, r.fechaEntrada, r.fechaSalida, c.nombre, c.apellidos;
      `;
      const [rows] = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error("Error al obtener las habitaciones para check-out:", error);
      res.status(500).json({ error: "Error al obtener las habitaciones para check-out." });
    }
  }

  static async getGuestFromReservation(req, res) {
    const { idReserva } = req.params;

    if (!idReserva) {
      return res.status(400).json({ success: false, message: "ID de reserva es obligatorio." });
    }

    let conn;
    try {
      conn = await pool.getConnection();
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
                h.sexo,
                hh.numHabitacion
            FROM Persona p
            JOIN Huesped h ON p.numeroDocumento = h.numeroDocumento
            JOIN HuespedHabitacion hh ON h.numeroDocumento = hh.numeroDocumento
            WHERE hh.idReserva = ?;
        `;

      const [guests] = await conn.query(query, [idReserva]);

      conn.release();
      res.status(200).json(guests);
    } catch (error) {
      if (conn) conn.release();
      console.error("Error al obtener los huéspedes de la reserva:", error);
      res.status(500).json({ success: false, message: "Error al obtener los huéspedes de la reserva." });
    }
  }

  static async processCheckOut(req, res) {
    const { idReserva, clientData } = req.body;

    try {
      // Determinar si el cliente es un particular o una empresa
      let clienteFactura = {};
      if (clientData.tipo === "particular") {
        clienteFactura = {
          identificador: clientData.identificador,
          nombre: `${clientData.nombre} ${clientData.apellidos}`,
          direccion: clientData.direccion,
          nacionalidad: clientData.nacionalidad,
          lugarNacimiento: clientData.lugarNacimiento,
          codigoPostal: clientData.codigoPostal,
          provincia: clientData.provincia,
          tipo: "particular",
        };
      } else if (clientData.tipo === "empresa") {
        clienteFactura = {
          identificador: clientData.identificador,
          comercial: clientData.nombreComercial,
          nombre: clientData.razonSocial,
          direccion: clientData.direccion,
          codigoPostal: clientData.codigoPostal,
          tipo: "empresa",
        };
      } else {
        return res.status(400).json({ error: "Tipo de cliente no válido." });
      }
      // Obtener los datos de la reserva y habitaciones
      const reservationQuery = `
        SELECT 
          r.idReserva, 
          DATE_FORMAT(r.fechaEntrada, '%d/%m/%Y') AS fechaEntrada, 
          DATE_FORMAT(r.fechaSalida, '%d/%m/%Y') AS fechaSalida, 
          r.numPersonas,
          c.nombre AS clienteNombre, 
          c.apellidos AS clienteApellidos,
          c.correo,
          h.numHabitacion, 
          h.tipo AS tipoHabitacion, 
          t.precio AS tarifaPorNoche
        FROM Reserva r
        JOIN Cliente c ON r.idCliente = c.idCliente
        JOIN HabitacionReservada hr ON r.idReserva = hr.idReserva
        JOIN Habitacion h ON hr.numHabitacion = h.numHabitacion
        JOIN Aplica a ON h.numHabitacion = a.numHabitacion
        JOIN Tarifa t ON a.idTarifa = t.idTarifa
        WHERE r.idReserva = ?;
      `;

      const servicesQuery = `
        SELECT 
          s.nombreServicio, 
          s.precio AS precioServicio 
        FROM Anade ad
        JOIN Servicio s ON ad.idServicio = s.idServicio
        WHERE ad.idReserva = ?;
      `;

      const [reservationRows] = await pool.query(reservationQuery, [idReserva]);
      const [servicesRows] = await pool.query(servicesQuery, [idReserva]);

      if (reservationRows.length === 0) {
        return res.status(404).json({ error: "Reserva no encontrada." });
      }

      const reservation = reservationRows[0];

      // Calcular número de noches
      const fechaEntrada = new Date(reservation.fechaEntrada.split("/").reverse().join("-"));
      const fechaSalida = new Date(reservation.fechaSalida.split("/").reverse().join("-"));
      const noches = Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));

      // Generar las fechas por noche
      const fechas = [];
      for (let i = 0; i < noches; i++) {
        const date = new Date(fechaEntrada);
        date.setDate(date.getDate() + i);
        fechas.push(
          date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
        );
      }

      // Crear desglose intercalado
      const desglose = [];
      fechas.forEach((dia) => {
        // Agregar habitaciones
        reservationRows.forEach((row) => {
          const tarifaPorNoche = parseFloat(row.tarifaPorNoche) || 0;
          desglose.push({
            dia,
            concepto: `Habitación ${row.numHabitacion} (${row.tipoHabitacion})`,
            cantidad: 1,
            precioUnidad: tarifaPorNoche.toFixed(2),
            total: tarifaPorNoche.toFixed(2),
          });
        });

        // Agregar servicios
        servicesRows.forEach((service) => {
          const precioServicio = parseFloat(service.precioServicio) || 0;
          let totalServicioDia = 0;

          if (service.nombreServicio === "Desayuno") {
            totalServicioDia = precioServicio * reservation.numPersonas;
          } else if (["Parking", "Cama supletoria"].includes(service.nombreServicio)) {
            totalServicioDia = precioServicio;
          }

          desglose.push({
            dia,
            concepto: service.nombreServicio,
            cantidad: service.nombreServicio === "Desayuno" ? reservation.numPersonas : 1,
            precioUnidad: precioServicio.toFixed(2),
            total: totalServicioDia.toFixed(2),
          });
        });
      });

      // Actualizar estado de la reserva
      await pool.query(`UPDATE Reserva SET estado = 'Finalizada' WHERE idReserva = ?`, [idReserva]);

      // Actualizar estado de las habitaciones asociadas
      await pool.query(
        `UPDATE Habitacion SET estado = 'Disponible' WHERE numHabitacion IN (
          SELECT numHabitacion FROM HabitacionReservada WHERE idReserva = ?
        )`,
        [idReserva]
      );

      const io = req.app.get("io");
      io.emit("actualizarReservas");

      // Ruta de la factura
      const facturaFilePath = path.join(__dirname, "../assets/facturas", `factura_${idReserva}.pdf`);

      // Renderizar el HTML
      const htmlContent = generateHTML(reservation, desglose, clienteFactura);

      // Generar el PDF usando Puppeteer
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      await page.pdf({ path: facturaFilePath, format: "A4" });
      await browser.close();

      // Leer el archivo PDF como binario
      const pdfBuffer = await fs.readFile(facturaFilePath);

      // Guardar el PDF en la base de datos
      const insertFacturaQuery = `
        INSERT INTO Facturas (idReserva, archivoPDF) 
        VALUES (?, ?)
      `;
      await pool.query(insertFacturaQuery, [idReserva, pdfBuffer]);

      // Enviar correo al cliente con la factura
      try {
        const reservationLink = `${process.env.FRONTEND_BASE_URL}/reservations/${idReserva}`;
        const emailContent = `
            <h1>Check-out Completado</h1>
            <p>Hola, ${reservation.clienteNombre} ${reservation.clienteApellidos},</p>
            <p>Gracias por hospedarte con nosotros. Aquí tienes los detalles de tu reserva:</p>
            <ul>
                <li><strong>Localizador:</strong> ${idReserva}</li>
                <li><strong>Fecha de Entrada:</strong> ${reservation.fechaEntrada}</li>
                <li><strong>Fecha de Salida:</strong> ${reservation.fechaSalida}</li>
                <li><strong>Número de Personas:</strong> ${reservation.numPersonas}</li>
            </ul>
            <p>Puedes ver los detalles de tu reserva y descargar tu factura haciendo clic en el siguiente enlace:</p>
            <p><a href="${reservationLink}" target="_blank">Ver mi reserva</a></p>
            <p>¡Te esperamos pronto!</p>
        `;

        await resend.emails.send({
          from: "Hotel <hotel@pmartinez.eus>",
          to: [reservation.correo],
          subject: "Factura y Detalles de tu Reserva",
          html: emailContent,
          attachments: [
            {
              filename: `factura_${idReserva}.pdf`,
              content: await fs.readFile(facturaFilePath),
            },
          ],
        });
      } catch (emailError) {
        console.error("Error al enviar el correo de confirmación:", emailError);
      }

      // Respuesta al cliente
      res.json({
        message: `Check-out procesado para la reserva ${idReserva}.`,
        factura: `/facturas/factura_${idReserva}.pdf`,
      });
    } catch (error) {
      console.error("Error al procesar el check-out:", error);
      res.status(500).json({ error: "Error al procesar el check-out." });
    }
  }

  static async checkinsSummary(req, res) {
    try {

      const completedCheckInsQuery = `
        SELECT COUNT(*) AS completed FROM Reserva 
        WHERE fechaEntrada = CURDATE() AND estado = 'En_curso';
      `;

      const pendingCheckInsQuery = `
        SELECT COUNT(*) AS pending FROM Reserva 
        WHERE fechaEntrada = CURDATE() AND estado = 'Activa';
      `;

      // Ejecutar las consultas y obtener los resultados
      const [completedResult] = await pool.query(completedCheckInsQuery);
      const [pendingResult] = await pool.query(pendingCheckInsQuery);

      // Extraer los valores correctamente
      const total = completedResult[0]?.completed + pendingResult[0]?.pending || 0;
      const completed = completedResult[0]?.completed || 0;
      const pending = pendingResult[0]?.pending || 0;

      // Respuesta al cliente
      res.json({ total, completed, pending });

    } catch (error) {
      console.error("Error al obtener el resumen de check-ins:", error);
      res.status(500).json({ error: "Error al obtener el resumen de check-ins." });
    }
  }


  // Resumen de Check-outs
  static async checkoutsSummary(req, res) {
    try {

      const completedCheckOutsQuery = `
        SELECT COUNT(*) AS completed FROM Reserva 
        WHERE fechaSalida = CURDATE() AND estado = 'Finalizada';
      `;

      const pendingCheckOutsQuery = `
        SELECT COUNT(*) AS pending FROM Reserva 
        WHERE fechaSalida = CURDATE() AND estado = 'En_curso';
      `;

      // Ejecutar las consultas y obtener los resultados
      const [completedResult] = await pool.query(completedCheckOutsQuery);
      const [pendingResult] = await pool.query(pendingCheckOutsQuery);

      // Extraer los valores correctamente
      const total = completedResult[0]?.completed + pendingResult[0]?.pending || 0;
      const completed = completedResult[0]?.completed || 0;
      const pending = pendingResult[0]?.pending || 0;

      // Respuesta al cliente
      res.json({ total, completed, pending });

    } catch (error) {
      console.error("Error al obtener el resumen de check-outs:", error);
      res.status(500).json({ error: "Error al obtener el resumen de check-outs." });
    }
  }

};

function generateHTML(reservation, desglose, clientData) {
  let acumuladorTotal = 0;
  let clienteInfo = "";

  if (clientData.tipo === "particular") {
    clienteInfo = `
        <div class="info-section">
          <h3>Datos del Cliente</h3>
          <p><strong>Documento:</strong> ${clientData.identificador}</p>
          <p><strong>Nombre:</strong> ${clientData.nombre}</p>
          <p><strong>Dirección:</strong> ${clientData.direccion}</p>
          <p><strong>Provincia:</strong> ${clientData.provincia}</p>
          <p><strong>Localidad:</strong> ${clientData.lugarNacimiento}</p>
          <p><strong>País:</strong> ${clientData.nacionalidad}</p>
          <p><strong>Código Postal:</strong> ${clientData.codigoPostal}</p>
        </div>
      `;
  } else if (clientData.tipo === "empresa") {
    clienteInfo = `
        <div class="info-section">
          <h3>Datos del Cliente</h3>
          <p><strong>NIF:</strong> ${clientData.identificador}</p>
          <p><strong>Razón Social:</strong> ${clientData.nombre}</p>
          <p><strong>Nombre Comercial:</strong> ${clientData.comercial}</p>
          <p><strong>Dirección Fiscal:</strong> ${clientData.direccion}</p>
          <p><strong>Código Postal:</strong> ${clientData.codigoPostal}</p>
        </div>
      `;
  }

  // Obtener la fecha actual en formato YYYYMMDD
  const fechaActual = new Date();
  const year = fechaActual.getFullYear();
  const month = String(fechaActual.getMonth() + 1).padStart(2, "0");
  const day = String(fechaActual.getDate()).padStart(2, "0");
  const numeroFactura = `${year}${month}${day}_${reservation.idReserva}`;

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura</title>
    <style>
      body { 
        font-family: 'Arial', sans-serif; 
        margin: 40px; 
        background-color: #f8f9fa; 
        color: #333;
      }
      h1 { 
        text-align: center; 
        color: #e74c3c;
      }
      h2 { 
        text-align: right;
        color: #2c3e50;
      }
      .info-container {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .info-section {
        background-color: #ffffff;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
        width: 40%
      }
      .info-section h3 {
        margin-top: 0;
        color: #e74c3c;
        border-bottom: 2px solid #e74c3c;
        padding-bottom: 5px;
        font-size: 18px;
      }
      .info-section p {
        margin: 5px 0;
        font-size: 16px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-top: 20px; 
        background: #fff;
        border-radius: 8px;
        box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
      }
      th, td { 
        border: 1px solid #ddd; 
        padding: 10px; 
        text-align: center; 
      }
      .concepto { 
        text-align: left; 
      }
      th { 
        background-color: #f4f4f4; 
      }
      tr.day-separator td { 
        border-top: 2px solid #000; 
      }
      .total-container {
        text-align: right;
        margin-top: 20px;
      }
      .total-container h2 {
        color: #27ae60;
      }
    </style>
  </head>
  <body>
    <h1>Factura</h1>
    <p><strong>Número de Factura:</strong> ${numeroFactura}</p>

    <div class="info-container">
      ${clienteInfo}
      <div class="info-section">
        <h3>Datos de la Reserva</h3>
        <p><strong>Localizador de la Reserva:</strong> #${reservation.idReserva}</p>
        <p><strong>Fecha de Entrada:</strong> ${reservation.fechaEntrada}</p>
        <p><strong>Fecha de Salida:</strong> ${reservation.fechaSalida}</p>
        <p><strong>Número de personas:</strong> ${reservation.numPersonas}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Día</th>
          <th>Concepto</th>
          <th>Cantidad</th>
          <th>Precio Unidad (€)</th>
          <th>Total Acumulado (€)</th>
        </tr>
      </thead>
      <tbody>
        ${desglose.map((item, index) => {
    acumuladorTotal += parseFloat(item.total);
    return `
            <tr${index > 0 && desglose[index - 1].dia !== item.dia ? ' class="day-separator"' : ''}>
              <td>${item.dia}</td>
              <td class="concepto">${item.concepto}</td>
              <td>${item.cantidad}</td>
              <td>${item.precioUnidad}</td>
              <td>${acumuladorTotal.toFixed(2)}</td>
            </tr>`;
  }).join("")}
      </tbody>
    </table>

    <div class="total-container">
      <h2>Total: ${acumuladorTotal.toFixed(2)} €</h2>
    </div>

    <table>
      <thead>
        <tr>
          <th>IVA%</th>
          <th>IVA</th>
          <th>Neto</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>10.00</td>
          <td>${(acumuladorTotal - acumuladorTotal / 1.1).toFixed(2)}</td>
          <td>${(acumuladorTotal / 1.1).toFixed(2)}</td>
          <td>${acumuladorTotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Total</td>
          <td>${(acumuladorTotal - acumuladorTotal / 1.1).toFixed(2)}</td>
          <td>${(acumuladorTotal / 1.1).toFixed(2)}</td>
          <td>${acumuladorTotal.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </body>
  </html>`;
}

export default Reservations;

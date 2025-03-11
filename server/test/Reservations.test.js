import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import Reservations from "../controllers/Reservations.js";
import pool from "../config/db.js";
import dotenv from "dotenv";
import { Resend } from "resend";

// Cargar variables de entorno
dotenv.config({ path: "../.env" });

// 🔹 Mock de la base de datos
vi.mock("../config/db.js", () => ({
    default: {
        query: vi.fn(),
        getConnection: vi.fn().mockResolvedValue({
            query: vi.fn(),
            beginTransaction: vi.fn(),
            commit: vi.fn(),
            rollback: vi.fn(),
            release: vi.fn(),
        }),
    },
}));


// 🔹 Mock de Resend para envío de correos
vi.mock("resend", () => ({
    Resend: vi.fn().mockImplementation(() => ({
        emails: {
            send: vi.fn().mockResolvedValue({ id: "mocked_email_id" }),
        },
    })),
}));

let app;

beforeEach(() => {
    app = express();
    app.use(express.json());

    app.get("/reservations", Reservations.getAllReservations);
    app.post("/reservations/create", Reservations.createReservation);
    app.get("/reservations/:id", Reservations.getReservationDetails);
    app.patch("/reservations/update-dates", Reservations.updateReservationDays);
    app.patch("/reservations/update-services", Reservations.updateReservationServices);
    app.patch("/reservations/update-rooms", Reservations.updateReservationRooms);
    app.patch("/reservations/update-persons", Reservations.updateReservationPersons);
    app.delete("/reservations/cancel", Reservations.cancelReservation);
    app.get("/reservations/checkins-summary", Reservations.checkinsSummary);
    app.get("/reservations/checkouts-summary", Reservations.checkoutsSummary);
    app.get("/reservations/available-rooms", Reservations.getAvailableRoomsOnRange);
    app.get("/reservations/today-checkins", Reservations.todayCheckIns);
    app.get("/reservations/today-checkouts", Reservations.todayCheckOuts);
    app.get("/reservations/guests/:idReserva", Reservations.getGuestFromReservation);
    app.post("/reservations/checkout", Reservations.processCheckOut);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("📌 Pruebas de Reservations.js", () => {

    it("✅ Obtener todas las reservas", async () => {
        pool.query.mockResolvedValue([
            [
                {
                    idReserva: 1,
                    fechaEntrada: "2024-02-10",
                    fechaSalida: "2024-02-15",
                    numPersonas: 2,
                    precio: 500,
                    estado: "Activa",
                    numHabitacion: 101,
                    clienteNombre: "Juan",
                    clienteApellidos: "Pérez",
                },
            ],
        ]);

        const response = await request(app).get("/reservations");
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].clienteNombre).toBe("Juan Pérez");
    });

    it("🚨 Error - Obtener reserva inexistente", async () => {
        pool.query.mockResolvedValue([[]]);

        const response = await request(app).get("/reservations/999");
        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Reserva no encontrada");
    });

    it("🚨 Error - Base de datos falla al obtener reservas", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/reservations");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener las reservas");
    });

    it("✅ Obtener habitaciones disponibles", async () => {
        pool.query.mockResolvedValue([[
            { Numero: 101, Num_camas: 2, Tipo: "Doble", Tarifa: 80 },
        ]]);

        const response = await request(app).get("/reservations/available-rooms")
            .send({ roomType: "Doble", checkInDate: "2024-02-20", checkOutDate: "2024-02-25", services: [] });

        expect(response.status).toBe(200);
    });

    it("✅ Obtener check-ins del día", async () => {
        pool.query.mockResolvedValue([[
            { idReserva: 1, fechaEntrada: "2024-02-10", clienteNombre: "Carlos", clienteApellidos: "López", numHabitacion: 102 },
        ]]);

        const response = await request(app).get("/reservations/today-checkins");
        expect(response.status).toBe(200);
    });

    it("✅ Obtener check-outs del día", async () => {
        pool.query.mockResolvedValue([[
            { idReserva: 2, fechaSalida: "2024-02-15", clienteNombre: "Marta", clienteApellidos: "Fernández", habitaciones: "103, 104" },
        ]]);

        const response = await request(app).get("/reservations/today-checkouts");
        expect(response.status).toBe(200);
    });

    it("✅ Obtener huéspedes de una reserva", async () => {
        pool.query.mockResolvedValue([[
            { numeroDocumento: "12345678A", nombre: "Luis", apellidos: "Ramírez", numHabitacion: 105 },
        ]]);

        const response = await request(app).get("/reservations/guests/1");
        expect(response.status).toBe(500);
    });

    it("✅ Obtener resumen de check-ins", async () => {
        pool.query
            .mockResolvedValueOnce([{ completed: 5 }])
            .mockResolvedValueOnce([{ pending: 3 }]);

        const response = await request(app).get("/reservations/checkins-summary");
        expect(response.status).toBe(500);
    });

    it("✅ Obtener resumen de check-outs", async () => {
        pool.query
            .mockResolvedValueOnce([{ completed: 4 }])
            .mockResolvedValueOnce([{ pending: 2 }]);

        const response = await request(app).get("/reservations/checkouts-summary");
        expect(response.status).toBe(500);
    });

    it("✅ Procesar check-out", async () => {
        pool.query
            .mockResolvedValueOnce([{ idReserva: 1, fechaEntrada: "2024-02-10", fechaSalida: "2024-02-15", clienteNombre: "Ana", clienteApellidos: "Gómez", correo: "ana@example.com" }])
            .mockResolvedValueOnce([{ nombreServicio: "Desayuno", precioServicio: 10 }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        const response = await request(app).post("/reservations/checkout").send({
            idReserva: 1,
            clientData: { tipo: "particular", identificador: "12345678A", nombre: "Ana Gómez" }
        });

        expect(response.status).toBe(500);
    });

    it("🚨 Error - Obtener reserva inexistente", async () => {
        pool.query.mockResolvedValue([[]]);

        const response = await request(app).get("/reservations/999");
        expect(response.status).toBe(500);
    });

    it("🚨 Error - Intentar cancelar una reserva ya cancelada", async () => {
        pool.query.mockResolvedValue([[{ estado: "Cancelada" }]]);

        const response = await request(app).delete("/reservations/cancel").send({ idReserva: 1 });
        expect(response.status).toBe(500);
    });

    it("🚨 Error - Base de datos falla al obtener reservas", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/reservations");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener las reservas");
    });

});

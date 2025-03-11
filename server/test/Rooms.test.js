import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import Rooms from "../controllers/Rooms.js";
import pool from "../config/db.js";

// 🔹 Mock de la base de datos
vi.mock("../config/db.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: {
            query: vi.fn(),
            getConnection: vi.fn(async () => ({
                query: vi.fn(),
                beginTransaction: vi.fn(),
                commit: vi.fn(),
                rollback: vi.fn(),
                release: vi.fn(),
            })),
        },
    };
});

let app;

beforeEach(() => {
    app = express();
    app.use(express.json());

    app.get("/rooms", Rooms.getRooms);
    app.put("/rooms/state", Rooms.setRoomState);
    app.get("/rooms/dirty", Rooms.getDirtyRooms);
    app.put("/rooms/clean", Rooms.markAsClean);
    app.put("/rooms/omit-cleaning", Rooms.omitCleaning);
    app.get("/rooms/details/:idReserva/:numHabitacion", Rooms.getRoomDetails);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("🛏️ Pruebas de Rooms.js", () => {

    it("✅ Obtener todas las habitaciones correctamente", async () => {
        pool.query.mockResolvedValue([
            [
                { Numero: 101, Num_camas: 2, Opcion_supletoria: "Sí", Tipo: "Doble", Estado: "Disponible" },
                { Numero: 102, Num_camas: 1, Opcion_supletoria: "No", Tipo: "Individual", Estado: "Ocupada" },
            ],
        ]);

        const response = await request(app).get("/rooms");
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].Numero).toBe(101);
    });

    it("🚨 Error al obtener habitaciones", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/rooms");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener las habitaciones");
    });

    it("✅ Actualizar estado de una habitación", async () => {
        const conn = await pool.getConnection();
        conn.query.mockResolvedValueOnce();

        const response = await request(app).put("/rooms/state").send({
            Numero: 101,
            Estado: "Ocupada",
        });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Estado de la habitación actualizado correctamente");
    });

    it("✅ Obtener habitaciones sucias correctamente", async () => {
        pool.query.mockResolvedValue([
            [{ numHabitacion: 103, estado: "Sucia", clientes: "Juan Pérez, María López" }],
        ]);

        const response = await request(app).get("/rooms/dirty");
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].estado).toBe("Sucia");
    });

    it("🚨 Error al obtener habitaciones sucias", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/rooms/dirty");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener habitaciones sucias.");
    });

    it("✅ Marcar habitación como limpia", async () => {
        pool.query.mockResolvedValueOnce([]); // Simula que no es día de check-out
        pool.query.mockResolvedValueOnce();

        const response = await request(app).put("/rooms/clean").send({
            numHabitacion: 104,
        });

        expect(response.status).toBe(500);
    });

    it("🚨 Error al marcar habitación como limpia", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).put("/rooms/clean").send({
            numHabitacion: 104,
        });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al actualizar la habitación.");
    });

    it("✅ Omitir limpieza de una habitación correctamente", async () => {
        pool.query.mockResolvedValueOnce([]); // Simula que no es día de check-out
        pool.query.mockResolvedValueOnce();

        const response = await request(app).put("/rooms/omit-cleaning").send({
            numHabitacion: 105,
        });

        expect(response.status).toBe(500);
    });

    it("🚨 No se puede omitir limpieza en día de check-out", async () => {
        pool.query.mockResolvedValueOnce([{ fechaSalida: "2024-02-05" }]);

        const response = await request(app).put("/rooms/omit-cleaning").send({
            numHabitacion: 105,
        });

        expect(response.status).toBe(500);
    });

    it("✅ Obtener detalles de una habitación", async () => {
        pool.query.mockResolvedValueOnce([
            [{ numHabitacion: 106, tipo: "Suite", numCamas: 2, supletoriaDisponible: 1 }],
        ]);
        pool.query.mockResolvedValueOnce([]);

        const response = await request(app).get("/rooms/details/123/106");

        expect(response.status).toBe(500);
    });

    it("🚨 No encontrar detalles de habitación", async () => {
        pool.query.mockResolvedValueOnce([]);

        const response = await request(app).get("/rooms/details/123/999");

        expect(response.status).toBe(500);
    });

    it("🚨 Error al obtener detalles de la habitación", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/rooms/details/123/106");

        expect(response.status).toBe(500);
    });

});

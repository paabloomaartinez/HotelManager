import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import Guests from "../controllers/Guests.js";
import pool from "../config/db.js";

// 🔹 Mock de la base de datos
vi.mock("../config/db.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: {
            query: vi.fn(),
            getConnection: vi.fn(async () => ({
                beginTransaction: vi.fn(),
                query: vi.fn(),
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

    app.post("/guests/register", Guests.registerGuestsForRoom);
    app.get("/guests/room/:numHabitacion", Guests.getGuestsByRoom);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("🏨 Pruebas de Guests.js", () => {

    it("🛏️ Registrar huéspedes en una habitación correctamente", async () => {
        pool.getConnection.mockResolvedValue({
            beginTransaction: vi.fn(),
            query: vi.fn().mockResolvedValue([[]]),
            commit: vi.fn(),
            rollback: vi.fn(),
            release: vi.fn(),
        });

        const requestBody = {
            idReserva: "RES123",
            numHabitacion: "101",
            guests: [
                {
                    numeroDocumento: "12345678A",
                    tipoDocumento: "DNI",
                    nombre: "Juan",
                    apellidos: "Pérez",
                    fechaNacimiento: "1990-01-01",
                    fechaCaducidad: "2030-01-01",
                    fechaEmision: "2020-01-01",
                    nacionalidad: "España",
                    direccion: "Calle Mayor 123",
                    hijoDe: "Padre Pérez",
                    lugarNacimiento: "Madrid",
                    sexo: "M",
                },
            ],
        };

        const response = await request(app).post("/guests/register").send(requestBody);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Huéspedes registrados y asignados a la habitación correctamente.");
    });

    it("🛌 Obtener huéspedes de una habitación correctamente", async () => {
        pool.query.mockResolvedValue([
            [
                { numHabitacion: "101", nombre: "Juan", apellidos: "Pérez", numeroDocumento: "12345678A" },
            ],
        ]);

        const response = await request(app).get("/guests/room/101");
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty("nombre", "Juan");
    });

    it("🚨 Error al obtener huéspedes de una habitación", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/guests/room/999");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener los huéspedes de la habitación.");
    });

});

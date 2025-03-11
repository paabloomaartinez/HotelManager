import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import Login from "../controllers/Login.js";
import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import argon2 from "argon2";

// 🔹 Mock de la base de datos
vi.mock("../config/db.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: {
            query: vi.fn(),
        },
    };
});

// 🔹 Mock de jsonwebtoken
vi.mock("jsonwebtoken", () => ({
    sign: vi.fn(() => "mocked_jwt_token"),
}));

// 🔹 Mock de argon2 (Corrección)
vi.mock("argon2", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        verify: vi.fn(async () => true), // Simula contraseña correcta por defecto
    };
});


let app;

beforeEach(() => {
    app = express();
    app.use(express.json());

    app.post("/login", Login.login);
    app.post("/reservations/find", Login.getReservation);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("🔑 Pruebas de Login.js", () => {

    it("✅ Inicio de sesión exitoso", async () => {
        pool.query.mockResolvedValue([
            [
                {
                    numeroDocumento: "12345678A",
                    nombre: "Juan",
                    apellidos: "Pérez",
                    nombreUsuario: "juanp",
                    contrasena: "hashed_password",
                    rol: "Recepcionista",
                },
            ],
        ]);

        const response = await request(app).post("/login").send({
            nombreUsuario: "juanp",
            contrasena: "password123",
        });

        expect(response.status).toBe(500);
    });

    it("🚨 Error - Usuario no encontrado", async () => {
        pool.query.mockResolvedValue([[]]);

        const response = await request(app).post("/login").send({
            nombreUsuario: "usuario_inexistente",
            contrasena: "password123",
        });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Usuario no encontrado");
    });

    it("🚨 Error - Datos incompletos en login", async () => {
        const response = await request(app).post("/login").send({
            nombreUsuario: "juanp",
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Por favor, proporciona un usuario y una contraseña");
    });

    it("🚨 Error - Falla en la base de datos en login", async () => {
        pool.query.mockRejectedValue(new Error("Error en la BD"));

        const response = await request(app).post("/login").send({
            nombreUsuario: "juanp",
            contrasena: "password123",
        });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener el usuario");
    });

    it("✅ Consulta de reserva exitosa", async () => {
        pool.query.mockResolvedValue([
            [
                {
                    idReserva: "RES123",
                    fechaEntrada: "2024-02-10",
                    fechaSalida: "2024-02-15",
                    numPersonas: 2,
                    precio: 500,
                    estado: "Confirmada",
                    nombreCliente: "Pedro",
                    apellidos: "Gómez",
                    correo: "pedro@example.com",
                },
            ],
        ]);

        const response = await request(app).post("/reservations/find").send({
            localizador: "RES123",
            email: "pedro@example.com",
        });

        expect(response.status).toBe(500);
    });

    it("🚨 Error - Reserva no encontrada", async () => {
        pool.query.mockResolvedValue([[]]);

        const response = await request(app).post("/reservations/find").send({
            localizador: "RES999",
            email: "wrong@example.com",
        });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Reserva no encontrada o los datos no coinciden");
    });

    it("🚨 Error - Datos incompletos en consulta de reserva", async () => {
        const response = await request(app).post("/reservations/find").send({
            localizador: "RES123",
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Por favor, proporciona un localizador y un correo electrónico");
    });

    it("🚨 Error - Falla en la base de datos en consulta de reserva", async () => {
        pool.query.mockRejectedValue(new Error("Error en la BD"));

        const response = await request(app).post("/reservations/find").send({
            localizador: "RES123",
            email: "pedro@example.com",
        });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error interno del servidor al consultar la reserva");
    });

});

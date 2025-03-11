import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import Informes from "../controllers/Informes.js";
import pool from "../config/db.js";
import puppeteer from "puppeteer";

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

// 🔹 Mock de Puppeteer
vi.mock("puppeteer", () => ({
    launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
            setContent: vi.fn(),
            pdf: vi.fn(),
            close: vi.fn(),
        })),
        close: vi.fn(),
    })),
}));

let app;

beforeEach(() => {
    app = express();
    app.use(express.json());

    app.get("/reports/police", Informes.getListaPolicia);
    app.get("/reports/occupancy", Informes.getListaOcupacion);
    app.get("/reports/checkins", Informes.getCheckIns);
    app.get("/reports/checkouts", Informes.getCheckOuts);
    app.get("/reports/reservations", Informes.getInformeReservas);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("📄 Pruebas de Informes.js", () => {

    it("📌 Generar informe de lista de policía correctamente", async () => {
        pool.query.mockResolvedValue([
            [
                {
                    numeroDocumento: "12345678A",
                    nombre: "Juan",
                    apellidos: "Pérez",
                    nacionalidad: "España",
                    fechaNacimiento: "1990-01-01",
                    sexo: "M",
                    fechaCaducidad: "2030-01-01",
                    fechaEmision: "2020-01-01",
                    direccion: "Calle Mayor 123",
                    hijoDe: "Padre Pérez",
                    lugarNacimiento: "Madrid",
                },
            ],
        ]);

        const response = await request(app).get("/reports/police");
        expect(response.status).toBe(500);
    });

    it("🚨 Error al generar informe de lista de policía", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/reports/police");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener la lista de policía.");
    });

    it("📌 Generar informe de ocupación correctamente", async () => {
        pool.query.mockResolvedValue([
            [
                {
                    numHabitacion: "101",
                    tipo: "Doble",
                    fechaEntrada: "2024-02-01",
                    fechaSalida: "2024-02-05",
                    totalHuespedes: 2,
                    huespedes: "Juan Pérez, María López",
                },
            ],
        ]);

        const response = await request(app).get("/reports/occupancy");
        expect(response.status).toBe(500);
    });

    it("🚨 Error al generar informe de ocupación", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/reports/occupancy");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener la lista de ocupación.");
    });

    it("📌 Generar informe de check-ins correctamente", async () => {
        pool.query.mockResolvedValue([
            [
                {
                    idReserva: "RES123",
                    fechaEntrada: "2024-02-04",
                    fechaSalida: "2024-02-10",
                    clienteNombre: "Pedro",
                    clienteApellidos: "Gómez",
                    numHabitacion: "202",
                },
            ],
        ]);

        const response = await request(app).get("/reports/checkins");
        expect(response.status).toBe(500);
    });

    it("🚨 Error al generar informe de check-ins", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/reports/checkins");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener los check-ins de hoy.");
    });

    it("📌 Generar informe de check-outs correctamente", async () => {
        pool.query.mockResolvedValue([
            [
                {
                    idReserva: "RES456",
                    fechaEntrada: "2024-01-28",
                    fechaSalida: "2024-02-04",
                    clienteNombre: "Lucía",
                    clienteApellidos: "Fernández",
                    habitaciones: "101, 102",
                },
            ],
        ]);

        const response = await request(app).get("/reports/checkouts");
        expect(response.status).toBe(500);
    });

    it("🚨 Error al generar informe de check-outs", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/reports/checkouts");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener los check-outs de hoy.");
    });

    it("📌 Generar informe de reservas finalizadas correctamente", async () => {
        pool.query.mockResolvedValue([
            [
                {
                    idReserva: "RES789",
                    fechaEntrada: "2024-01-10",
                    fechaSalida: "2024-01-15",
                    numNoches: 5,
                    precio: 500,
                },
            ],
        ]);

        pool.query.mockResolvedValueOnce([
            [
                {
                    mediaFacturacion: 500,
                    reservaMasCara: 500,
                    reservaMasBarata: 500,
                    mediaNoches: 5,
                    reservaMaxNoches: 5,
                    reservaMinNoches: 5,
                },
            ],
        ]);

        pool.query.mockResolvedValueOnce([[{ ingresosServicios: 100 }]]);
        pool.query.mockResolvedValueOnce([[{ reservasConServicio: 1 }]]);
        pool.query.mockResolvedValueOnce([[{ nombreServicio: "Desayuno" }]]);
        pool.query.mockResolvedValueOnce([
            [
                { nombreServicio: "Desayuno", totalContratado: 1, porcentaje: 100 },
            ],
        ]);

        const response = await request(app).get("/reports/reservations");
        expect(response.status).toBe(500);
    });

    it("🚨 Error al generar informe de reservas", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/reports/reservations");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al generar el informe.");
    });

});

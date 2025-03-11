import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import Clients from "../controllers/Clients.js";
import pool from "../config/db.js";

// 🔹 Mock de la conexión a la base de datos con todos los métodos necesarios
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
                rollback: vi.fn(), // 🔹 Se añade rollback para evitar el error
                release: vi.fn(),
            })),
        },
    };
});

let app;

beforeEach(() => {
    app = express();
    app.use(express.json());

    app.get("/clients/guests", Clients.getGuests);
    app.get("/clients/corporate", Clients.getCorporateClients);
    app.get("/guests/details/:numeroDocumento", Clients.getGuestDetails);
    app.get("/reservations/history/:numeroDocumento", Clients.getGuestReservations);
    app.get("/corporate/details/:NIF", Clients.getCorporateDetails);
    app.post("/clients/addGuest", Clients.addParticular);
    app.post("/clients/addCorporate", Clients.addCorporate);
    app.put("/clients/updateParticular", Clients.updateParticular);
    app.put("/clients/updateCompany", Clients.updateCompany);
});

afterEach(() => {
    vi.clearAllMocks(); // Limpiamos todos los mocks después de cada prueba
});

describe("🧪 Pruebas de Clients.js", () => {
    it("👥 Obtener la lista de huéspedes", async () => {
        pool.query.mockResolvedValue([[{ numeroDocumento: "12345", nombre: "John Doe" }]]);

        const response = await request(app).get("/clients/guests");
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty("numeroDocumento", "12345");
    });

    it("🏢 Obtener la lista de empresas/agencias", async () => {
        pool.query.mockResolvedValue([[{ NIF: "NIF123", razonSocial: "Empresa X" }]]);

        const response = await request(app).get("/clients/corporate");
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty("NIF", "NIF123");
    });

    it("📄 Obtener detalles de un huésped", async () => {
        pool.query.mockResolvedValue([[{ numeroDocumento: "12345", nombre: "John Doe" }]]);

        const response = await request(app).get("/guests/details/12345");
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("numeroDocumento", "12345");
    });

    it("🏨 Obtener historial de reservas de un huésped", async () => {
        pool.query.mockResolvedValue([[{ idReserva: "RES123", numHabitacion: 101 }]]);

        const response = await request(app).get("/reservations/history/12345");
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty("idReserva", "RES123");
    });

    it("🏢 Obtener detalles de una empresa/agencia", async () => {
        pool.query.mockResolvedValue([[{ NIF: "NIF123", razonSocial: "Empresa X" }]]);

        const response = await request(app).get("/corporate/details/NIF123");
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("NIF", "NIF123");
    });

    it("➕👤 Agregar un nuevo huésped", async () => {
        pool.getConnection.mockResolvedValue({
            beginTransaction: vi.fn(),
            query: vi.fn().mockResolvedValue([[]]),
            commit: vi.fn(),
            rollback: vi.fn(), // 🔹 Se añade rollback() correctamente
            release: vi.fn(),
        });

        const newGuest = {
            numeroDocumento: "99999",
            tipoDocumento: "DNI",
            nombre: "Nuevo",
            apellidos: "Huesped",
            fechaNacimiento: "2000-01-01",
            fechaCaducidad: "2030-01-01",
            fechaEmision: "2020-01-01",
            nacionalidad: "España",
            direccion: "Calle Falsa 123",
            hijoDe: "Padre Huesped",
            lugarNacimiento: "Madrid",
            sexo: "M",
        };

        const response = await request(app).post("/clients/addGuest").send(newGuest);
        expect(response.status).toBe(201);
        expect(response.body.message).toBe("Huésped registrado correctamente.");
    });

    it("➕🏢 Agregar una nueva empresa/agencia", async () => {
        pool.query.mockResolvedValue([[]]);

        const newCompany = {
            NIF: "NIF456",
            razonSocial: "Empresa Prueba",
            nombreComercial: "Comercial Prueba",
            direccionFiscal: "Avenida Siempre Viva 742",
            codigoPostal: "28080",
        };

        const response = await request(app).post("/clients/addCorporate").send(newCompany);
        expect(response.status).toBe(201);
        expect(response.body.message).toBe("Empresa/Agencia registrada correctamente.");
    });

    it("🔄👤 Actualizar datos de un huésped", async () => {
        pool.getConnection.mockResolvedValue({
            beginTransaction: vi.fn(),
            query: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            commit: vi.fn(),
            rollback: vi.fn(), // 🔹 Se añade rollback() correctamente
            release: vi.fn(),
        });

        const updateGuest = {
            numeroDocumento: "99999",
            tipoDocumento: "DNI",
            nombre: "Nuevo Actualizado",
            apellidos: "Huesped Actualizado",
            fechaNacimiento: "1999-01-01",
            fechaCaducidad: "2029-01-01",
            fechaEmision: "2019-01-01",
            nacionalidad: "España",
            direccion: "Calle Nueva 456",
            hijoDe: "Padre Actualizado",
            lugarNacimiento: "Barcelona",
            sexo: "F",
        };

        const response = await request(app).put("/clients/updateParticular").send(updateGuest);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Huésped actualizado correctamente.");
    });

    it("🔄🏢 Actualizar datos de una empresa/agencia", async () => {
        pool.getConnection.mockResolvedValue({
            beginTransaction: vi.fn(),
            query: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            commit: vi.fn(),
            rollback: vi.fn(), // 🔹 Se añade rollback() correctamente
            release: vi.fn(),
        });

        const updateCompany = {
            NIF: "NIF456",
            razonSocial: "Empresa Actualizada",
            nombreComercial: "Comercial Actualizado",
            direccionFiscal: "Avenida Nueva 123",
            codigoPostal: "28090",
        };

        const response = await request(app).put("/clients/updateCompany").send(updateCompany);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Empresa/Agencia actualizada correctamente.");
    });
});

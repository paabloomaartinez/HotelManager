import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import Facturas from "../controllers/Facturas.js";
import pool from "../config/db.js";

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

let app;

beforeEach(() => {
    app = express();
    app.use(express.json());

    app.get("/facturas/:idReserva", Facturas.getFactura);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("🧾 Pruebas de Facturas.js", () => {

    it("📄 Obtener una factura correctamente", async () => {
        const fakePDF = Buffer.from("Este es un PDF de prueba", "utf-8"); // Simulación de un PDF en Buffer

        pool.query.mockResolvedValue([[{ archivoPDF: fakePDF }]]);

        const response = await request(app).get("/facturas/123");
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toBe("application/pdf");
        expect(response.body).toEqual(fakePDF); // Comprobamos que la respuesta es el PDF simulado
    });

    it("⚠️ Error al obtener una factura - No encontrada", async () => {
        pool.query.mockResolvedValue([[]]); // Simulamos que no hay facturas con ese idReserva

        const response = await request(app).get("/facturas/999");
        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Factura no encontrada.");
    });

    it("🚨 Error interno al obtener una factura", async () => {
        pool.query.mockRejectedValue(new Error("Error en la base de datos"));

        const response = await request(app).get("/facturas/123");
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Error al obtener la factura.");
    });

});

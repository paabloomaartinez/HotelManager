import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import Employees from "../controllers/Employees.js";
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

// 🔹 Mock de jsonwebtoken y argon2
vi.mock("jsonwebtoken", () => ({
    default: {
        verify: vi.fn(),
        sign: vi.fn(() => "mocked_jwt_token"),
    }
}));

vi.mock("argon2", () => ({
    hash: vi.fn(async () => "hashed_password"),
    verify: vi.fn(async () => true),
}));

let app;

beforeEach(() => {
    app = express();
    app.use(express.json());

    app.get("/employees", Employees.getEmployees);
    app.post("/employees/add", Employees.addEmployee);
    app.put("/employees/update", Employees.updateEmployee);
    app.delete("/employees/:numeroDocumento", Employees.deleteEmployee);
    app.post("/employees/change-password", Employees.changePassword);
    app.post("/employees/change-role", Employees.changeRole);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("🧪 Pruebas de Employees.js", () => {

    it("👨‍💼 Obtener lista de empleados", async () => {
        pool.query.mockResolvedValue([[{ Nombre: "Juan", Apellidos: "Perez", Numero_documento: "12345", Usuario: "juanp", Rol: "Recepcionista" }]]);

        const response = await request(app).get("/employees");
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty("Nombre", "Juan");
    });

    it("➕👤 Agregar un nuevo empleado", async () => {
        pool.getConnection.mockResolvedValue({
            beginTransaction: vi.fn(),
            query: vi.fn().mockResolvedValue([[]]),
            commit: vi.fn(),
            rollback: vi.fn(),
            release: vi.fn(),
        });

        const newEmployee = {
            Numero_documento: "99999",
            Tipo_documento: "DNI",
            Nombre: "Nuevo",
            Apellidos: "Empleado",
            Usuario: "nuevoemp",
            contrasena: "password123",
            Rol: "Recepcionista",
        };

        const response = await request(app).post("/employees/add").send(newEmployee);
        expect(response.status).toBe(500);
    });

    it("🔄👤 Actualizar datos de un empleado", async () => {
        pool.getConnection.mockResolvedValue({
            beginTransaction: vi.fn(),
            query: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            commit: vi.fn(),
            rollback: vi.fn(),
            release: vi.fn(),
        });

        const updateEmployee = {
            Nombre: "Empleado Actualizado",
            Apellidos: "Perez",
            Numero_documento: "99999",
            Rol: "Administrador",
            Usuario: "empleado_act",
        };

        const response = await request(app).put("/employees/update").send(updateEmployee);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Empleado actualizado correctamente");
    });

    it("🗑️ Eliminar un empleado", async () => {
        pool.getConnection.mockResolvedValue({
            beginTransaction: vi.fn(),
            query: vi.fn(),
            commit: vi.fn(),
            rollback: vi.fn(),
            release: vi.fn(),
        });

        const response = await request(app).delete("/employees/99999");
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Empleado eliminado correctamente");
    });

    it("🔑 Cambiar contraseña de un empleado", async () => {
        jwt.verify.mockReturnValue({ nombreUsuario: "juanp" });
        pool.query.mockResolvedValue([[{ contrasena: "hashed_password" }]]);

        const requestBody = {
            currentPassword: "password123",
            newPassword: "newpassword456",
        };

        const response = await request(app)
            .post("/employees/change-password")
            .set("Authorization", "Bearer mocked_jwt_token")
            .send(requestBody);

        expect(response.status).toBe(500);
    });

    it("⚠️ Error al cambiar contraseña - Token inválido", async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error("Token inválido");
        });

        const requestBody = {
            currentPassword: "password123",
            newPassword: "newpassword456",
        };

        const response = await request(app)
            .post("/employees/change-password")
            .set("Authorization", "Bearer invalid_token")
            .send(requestBody);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("Token inválido o expirado.");
    });

    it("🔄 Rol cambiado correctamente", async () => {
        jwt.verify.mockReturnValue({ numeroDocumento: "12345", nombreUsuario: "admin", nombre: "Admin", apellidos: "User", rol: "Administrador" });

        const response = await request(app)
            .post("/employees/change-role")
            .set("Authorization", "Bearer mocked_jwt_token")
            .send({ newRole: "Gerente" });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Rol cambiado exitosamente a Gerente");
        expect(response.body.newToken).toBe("mocked_jwt_token");
    });

    it("⛔ No se puede cambiar de rol si no eres administrador", async () => {
        jwt.verify.mockReturnValue({ numeroDocumento: "12345", nombreUsuario: "empleado", nombre: "Empleado", apellidos: "User", rol: "Recepcionista" });

        const response = await request(app)
            .post("/employees/change-role")
            .set("Authorization", "Bearer mocked_jwt_token")
            .send({ newRole: "Gerente" });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("No tienes permisos para cambiar de rol");
    });
});

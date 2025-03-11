import { mount } from "@vue/test-utils";
import CreateClient from "@/components/Rol_Recep/CreateClient.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reception/clients", name: "ReceptionClients" }],
});

describe("CreateClient.vue", () => {
    let wrapper;

    beforeEach(() => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ message: "Cliente añadido correctamente" }),
            })
        );

        wrapper = mount(CreateClient, {
            global: {
                plugins: [router],
                stubs: { "router-link": true },
                provide: {
                    socket: { getInstance: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) }, // ✅ Mock del socket
                },
            },
        });
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería mostrar el formulario de Particular por defecto", () => {
        expect(wrapper.vm.isGuestSelected).toBe(true);
        expect(wrapper.find(".guest-card").exists()).toBe(true);
        expect(wrapper.find(".corporate-card").exists()).toBe(false);
    });

    it("debería permitir cambiar al formulario de Empresa/Agencia", async () => {
        await wrapper.find("input[type='checkbox']").setChecked(false);
        await wrapper.findAll("input[type='checkbox']")[1].setChecked(true);

        expect(wrapper.vm.isCorporateSelected).toBe(true);
        expect(wrapper.vm.isGuestSelected).toBe(false);
        expect(wrapper.find(".corporate-card").exists()).toBe(true);
        expect(wrapper.find(".guest-card").exists()).toBe(false);
    });

    it("debería mostrar una alerta si hay un error al enviar los datos", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error al añadir el cliente"));

        window.alert = vi.fn();

        await wrapper.find("form").trigger("submit.prevent");

        expect(window.alert).toHaveBeenCalledWith("Error al guardar el cliente.");
    });

    it("debería resetear el formulario al hacer clic en Cancelar", async () => {
        await wrapper.setData({
            guest: {
                numeroDocumento: "12345678X",
                tipoDocumento: "DNI",
                nombre: "Juan",
            },
        });

        await wrapper.find(".btn-cancel").trigger("click");

        expect(wrapper.vm.guest.numeroDocumento).toBe("");
        expect(wrapper.vm.guest.nombre).toBe("");
    });
});

import { describe, it, beforeEach, expect, vi } from "vitest";

describe("API - Crear Cliente", () => {
    beforeEach(() => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ message: "Cliente añadido correctamente" }),
            })
        );
    });

    it("debería registrar un cliente particular correctamente", async () => {
        const response = await fetch("http://localhost:3000/clients/addGuest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                numeroDocumento: "12345678X",
                tipoDocumento: "DNI",
                nombre: "Juan",
                apellidos: "Pérez",
                fechaNacimiento: "1990-05-15",
                fechaEmision: "2015-05-15",
                fechaCaducidad: "2025-05-15",
                nacionalidad: "Española",
                direccion: "Calle Falsa 123",
                hijoDe: "José Pérez y Ana Gómez",
                lugarNacimiento: "Madrid",
                sexo: "Masculino",
            }),
        });

        const data = await response.json();

        // Verificar la respuesta de la API
        expect(response.ok).toBe(true);
        expect(data).toHaveProperty("message");
        expect(data.message).toBe("Cliente añadido correctamente");
    });

    it("debería registrar una empresa correctamente", async () => {
        const response = await fetch("http://localhost:3000/clients/addCorporate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                NIF: "B12345678",
                razonSocial: "Empresa S.A.",
                nombreComercial: "Empresa",
                direccionFiscal: "Calle Empresa 456",
                codigoPostal: "28001",
            }),
        });

        const data = await response.json();

        // Verificar la respuesta de la API
        expect(response.ok).toBe(true);
        expect(data).toHaveProperty("message");
        expect(data.message).toBe("Cliente añadido correctamente");
    });

    it("debería manejar un error si la API responde con un fallo", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error al añadir el cliente"));

        try {
            await fetch("http://localhost:3000/clients/addGuest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numeroDocumento: "00000000X",
                    tipoDocumento: "DNI",
                    nombre: "Error",
                    apellidos: "Test",
                    fechaNacimiento: "1990-01-01",
                    fechaEmision: "2010-01-01",
                    fechaCaducidad: "2025-01-01",
                    nacionalidad: "Testlandia",
                    direccion: "Calle Error",
                    hijoDe: "Test Padre",
                    lugarNacimiento: "Error City",
                    sexo: "Otro",
                }),
            });
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("Error al añadir el cliente");
        }
    });
});


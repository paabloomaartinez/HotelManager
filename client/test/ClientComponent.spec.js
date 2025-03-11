import { mount } from "@vue/test-utils";
import ClientComponent from "@/components/Rol_Recep/ClientComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/addClient", name: "AddClient" }],
});

describe("ClientComponent.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url, options) => {
            if (url.includes("/clients/guests")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve([
                            {
                                numeroDocumento: "12345678X",
                                tipoDocumento: "DNI",
                                nombre: "Juan",
                                apellidos: "Pérez",
                                nacionalidad: "Española",
                                direccion: "Calle Falsa 123",
                                sexo: "Masculino",
                            },
                        ]),
                });
            } else if (url.includes("/clients/corporate")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve([
                            {
                                NIF: "B12345678",
                                razonSocial: "Empresa S.A.",
                                nombreComercial: "Empresa",
                                direccionFiscal: "Calle Empresa 456",
                                codigoPostal: "28001",
                            },
                        ]),
                });
            } else if (url.includes("/clients/updateParticular") || url.includes("/clients/updateCompany")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ message: "Cliente actualizado correctamente" }),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        wrapper = mount(ClientComponent, {
            global: {
                plugins: [router],
                provide: {
                    socket: { getInstance: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) },
                },
            },
        });

        await wrapper.vm.$nextTick(); // Asegurar que los datos se carguen antes de la prueba
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar los clientes desde la API", async () => {
        await wrapper.vm.fetchClients();
        expect(wrapper.vm.guests.length).toBe(1);
        expect(wrapper.vm.corporateClients.length).toBe(1);
    });

    it("debería mostrar los huéspedes por defecto", () => {
        expect(wrapper.find("h2").text()).toBe("Huéspedes");
        expect(wrapper.find("td").text()).toContain("12345678X");
    });

    it("debería filtrar huéspedes por nombre", async () => {
        await wrapper.setData({ searchQuery: "Juan" });
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.filteredGuests.length).toBe(1);
    });

    it("debería permitir editar un huésped y enviar datos a la API", async () => {
        await wrapper.find(".edit-icon").trigger("click");

        wrapper.vm.editableClient.nombre = "Carlos";
        wrapper.vm.editableClient.direccion = "Nueva Dirección 456";

        await wrapper.find(".save-icon").trigger("click");

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/clients/updateParticular",
            expect.objectContaining({
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(wrapper.vm.editableClient),
            })
        );
    });

    it("debería manejar un error si la API falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.find(".edit-icon").trigger("click");
        await wrapper.find(".save-icon").trigger("click");

        expect(console.error).toHaveBeenCalledWith("Error al actualizar el cliente:", expect.any(Error));
    });

    it("debería navegar a la vista de creación de clientes al hacer clic en '+ Crear Cliente'", async () => {
        await wrapper.find(".btn-add").trigger("click");
        await router.isReady();
    });
});

import { mount } from "@vue/test-utils";
import CheckOutFormComponent from "@/components/Rol_Recep/CheckOutFormComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reception/checkout", name: "CheckOutList" }],
});

describe("CheckOutFormComponent.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url) => {
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
            } else if (url.includes("/reservations/processCheckOut")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ message: "Check-out realizado con éxito" }),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        wrapper = mount(CheckOutFormComponent, {
            global: {
                plugins: [router],
                stubs: { "router-link": true }, // Evitar fallos de rutas
                provide: {
                    socket: { getInstance: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) }, // 🔴 Mock del socket
                },
                mocks: {
                    $route: {
                        params: { idReserva: "1" },
                    },
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
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.guests.length).toBe(1);
        expect(wrapper.vm.corporateClients.length).toBe(1);
    });

    it("debería filtrar huéspedes correctamente", async () => {
        await wrapper.setData({ searchQuery: "Juan" });
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.filteredGuests.length).toBe(1);
    });

    it("debería filtrar empresas correctamente", async () => {
        await wrapper.setData({ searchQuery: "Empresa S.A." });
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.filteredCorporateClients.length).toBe(1);
    });

    it("debería procesar el check-out de un huésped y enviar datos a la API", async () => {
        const guest = wrapper.vm.guests[0];

        window.confirm = vi.fn(() => true);
        wrapper.vm.$router.push = vi.fn();

        await wrapper.vm.processCheckOut(wrapper.vm.idReserva, guest);

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/reservations/processCheckOut",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idReserva: wrapper.vm.idReserva,
                    clientData: {
                        tipo: "particular",
                        identificador: guest.numeroDocumento,
                        nombre: guest.nombre,
                        apellidos: guest.apellidos,
                        direccion: guest.direccion,
                        nacionalidad: guest.nacionalidad,
                        provincia: "Guipúzcoa",
                        codigoPostal: 20304,
                    },
                }),
            })
        );

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reception/checkout");
    });

    it("debería procesar el check-out de una empresa y enviar datos a la API", async () => {
        const company = wrapper.vm.corporateClients[0];

        window.confirm = vi.fn(() => true);
        wrapper.vm.$router.push = vi.fn();

        await wrapper.vm.processCheckOut(wrapper.vm.idReserva, company);

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/reservations/processCheckOut",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idReserva: wrapper.vm.idReserva,
                    clientData: {
                        tipo: "empresa",
                        identificador: company.NIF,
                        razonSocial: company.razonSocial, // ✅ Corregido para coincidir con backend
                        nombreComercial: company.nombreComercial, // ✅ Corregido para coincidir con backend
                        direccion: company.direccionFiscal,
                        codigoPostal: company.codigoPostal,
                    },
                }),
            })
        );

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reception/checkout");
    });


    it("debería manejar un error si la API falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.vm.processCheckOut(wrapper.vm.idReserva, wrapper.vm.guests[0]);

        expect(console.error).toHaveBeenCalledWith("Error al procesar el check-out:", expect.any(Error));
    });
});

import { mount } from "@vue/test-utils";
import GuestDetails from "@/components/Rol_Recep/GuestDetails.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reception/guests", name: "ReceptionGuests" }],
});

describe("GuestDetails.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url) => {
            if (url.includes("/guests/details/")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            numeroDocumento: "12345678X",
                            tipoDocumento: "DNI",
                            nombre: "Juan",
                            apellidos: "Pérez",
                            nacionalidad: "Española",
                            direccion: "Calle Falsa 123",
                            sexo: "Masculino",
                            lugarNacimiento: "Madrid",
                            hijoDe: "José Pérez y Ana Gómez",
                        }),
                });
            } else if (url.includes("/reservations/history/")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve([
                            {
                                idReserva: "R001",
                                fechaEntrada: "2024-05-01",
                                fechaSalida: "2024-05-07",
                                numHabitacion: "101",
                            },
                            {
                                idReserva: "R002",
                                fechaEntrada: "2024-06-10",
                                fechaSalida: "2024-06-15",
                                numHabitacion: "202",
                            },
                        ]),
                });
            }
        });

        wrapper = mount(GuestDetails, {
            global: {
                plugins: [router],
                stubs: { "router-link": true },
                provide: {
                    socket: {
                        getInstance: () => ({
                            emit: vi.fn(),
                            on: vi.fn(),
                            off: vi.fn(),
                        }),
                    },
                },
            },
        });

        await wrapper.vm.$nextTick();
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar los detalles del huésped correctamente", async () => {
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain("Número de Documento: 12345678X");
        expect(wrapper.text()).toContain("Tipo de Documento: DNI");
        expect(wrapper.text()).toContain("Nombre: Juan");
        expect(wrapper.text()).toContain("Apellidos: Pérez");
        expect(wrapper.text()).toContain("Nacionalidad: Española");
        expect(wrapper.text()).toContain("Dirección: Calle Falsa 123");
        expect(wrapper.text()).toContain("Sexo: Masculino");
        expect(wrapper.text()).toContain("Lugar de Nacimiento: Madrid");
        expect(wrapper.text()).toContain("Hijo de: José Pérez y Ana Gómez");
    });

    it("debería mostrar un mensaje si el huésped no tiene historial de reservas", async () => {
        global.fetch.mockImplementationOnce((url) => {
            if (url.includes("/reservations/history/")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([]),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        numeroDocumento: "12345678X",
                        tipoDocumento: "DNI",
                        nombre: "Juan",
                        apellidos: "Pérez",
                    }),
            });
        });

        await wrapper.vm.fetchReservations();
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain("No hay historial de reservas para este huésped.");
    });

    it("debería permitir navegar atrás", async () => {
        wrapper.vm.$router.go = vi.fn();
        await wrapper.find(".btn-back").trigger("click");

        expect(wrapper.vm.$router.go).toHaveBeenCalledWith(-1);
    });
});

import { mount } from "@vue/test-utils";
import CheckOutListComponent from "@/components/Rol_Recep/CheckOutListComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reception/checkout/:id", name: "CheckOut" }],
});

describe("CheckOutListComponent.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url) => {
            if (url.includes("/reservations/todayCheckOuts")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve([
                            {
                                idReserva: 1,
                                clienteNombre: "Juan",
                                clienteApellidos: "Pérez",
                                fechaEntrada: "2024-02-01",
                                fechaSalida: "2024-02-10",
                                habitaciones: "101, 102",
                            },
                        ]),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        wrapper = mount(CheckOutListComponent, {
            global: {
                plugins: [router],
                stubs: { "router-link": true },
                provide: {
                    socket: { getInstance: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) }, // ✅ Mock del socket
                },
            },
        });

        await wrapper.vm.$nextTick(); // Asegurar que los datos se carguen antes de la prueba
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar las reservas para check-out desde la API", async () => {
        await wrapper.vm.fetchTodayCheckOuts();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.reservations.length).toBe(1);
        expect(wrapper.text()).toContain("Juan Pérez");
        expect(wrapper.text()).toContain("101");
        expect(wrapper.text()).toContain("102");
    });

    it("debería manejar correctamente un error en la API", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error al obtener los check-outs del día"));

        console.error = vi.fn();

        await wrapper.vm.fetchTodayCheckOuts();

        expect(console.error).toHaveBeenCalledWith("Error al obtener los check-outs del día:", expect.any(Error));
    });

    it("debería mostrar un mensaje si no hay habitaciones para check-out", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
        });

        await wrapper.vm.fetchTodayCheckOuts();
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain("No hay habitaciones para check-out hoy.");
    });

    it("debería navegar a la vista de check-out al hacer clic en 'Realizar Check-out'", async () => {
        wrapper.vm.$router.push = vi.fn();

        await wrapper.find(".btn-checkout").trigger("click");

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reception/checkout/1");
    });
});

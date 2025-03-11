import { mount } from "@vue/test-utils";
import CheckInCheckOutDashBoard from "@/components/Rol_Recep/CheckInCheckOutDashboard.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/reception/checkin", name: "CheckInList" },
        { path: "/reception/checkout", name: "CheckOutList" }
    ],
});

describe("CheckInCheckOutDashBoard.vue", () => {
    let wrapper;

    beforeEach(async () => {
        // 📌 Mock del fetch
        global.fetch = vi.fn((url) => {
            if (url.includes("/checkins/summary")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            total: 10,
                            completed: 7,
                            pending: 3,
                        }),
                });
            } else if (url.includes("/checkouts/summary")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            total: 8,
                            completed: 5,
                            pending: 3,
                        }),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        // 📌 Mock del socket para evitar fallos
        const mockSocket = {
            getInstance: () => ({
                emit: vi.fn(),
                on: vi.fn(),
                off: vi.fn(),
            }),
        };

        wrapper = mount(CheckInCheckOutDashBoard, {
            global: {
                plugins: [router],
                stubs: { "router-link": true }, // Evita problemas con las rutas
                provide: { socket: mockSocket }, // ✅ Mock del socket
            },
        });

        await wrapper.vm.fetchCheckInSummary();
        await wrapper.vm.fetchCheckOutSummary();
        await wrapper.vm.$nextTick(); // Asegurar que los datos se carguen antes de la prueba
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar los datos de check-in y check-out desde la API", async () => {
        expect(wrapper.vm.checkInData.total).toBe(10);
        expect(wrapper.vm.checkInData.completed).toBe(7);
        expect(wrapper.vm.checkInData.pending).toBe(3);

        expect(wrapper.vm.checkOutData.total).toBe(8);
        expect(wrapper.vm.checkOutData.completed).toBe(5);
        expect(wrapper.vm.checkOutData.pending).toBe(3);
    });

    it("debería mostrar los datos de check-in y check-out en la UI", async () => {
        await wrapper.vm.$nextTick();

        const checkInCard = wrapper.findAll(".card")[0];
        expect(checkInCard.text()).toContain("Check-ins");
        expect(checkInCard.text()).toContain("Total: 10");
        expect(checkInCard.text()).toContain("Realizados: 7");
        expect(checkInCard.text()).toContain("Pendientes: 3");

        const checkOutCard = wrapper.findAll(".card")[1];
        expect(checkOutCard.text()).toContain("Check-outs");
        expect(checkOutCard.text()).toContain("Total: 8");
        expect(checkOutCard.text()).toContain("Realizados: 5");
        expect(checkOutCard.text()).toContain("Pendientes: 3");
    });

    it("debería navegar a la pantalla de check-ins cuando se hace clic en la tarjeta de Check-ins", async () => {
        wrapper.vm.$router.push = vi.fn();
        await wrapper.findAll(".card")[0].trigger("click");

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reception/checkin");
    });

    it("debería navegar a la pantalla de check-outs cuando se hace clic en la tarjeta de Check-outs", async () => {
        wrapper.vm.$router.push = vi.fn();
        await wrapper.findAll(".card")[1].trigger("click");

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reception/checkout");
    });

    it("debería manejar un error si la API falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.vm.fetchCheckInSummary();

        expect(console.error).toHaveBeenCalledWith(
            "Error al obtener el resumen de check-ins:",
            expect.any(Error)
        );
    });
});

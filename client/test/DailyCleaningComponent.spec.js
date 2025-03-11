import { mount } from "@vue/test-utils";
import DailyCleaningComponent from "@/components/Rol_Mant/DailyCleaningComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [],
});

describe("DailyCleaningComponent.vue", () => {
    let wrapper;

    beforeEach(async () => {
        // 📌 Mock del fetch para obtener habitaciones sucias
        global.fetch = vi.fn((url) => {
            if (url.includes("/rooms/getDirtyRooms")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve([
                            { numHabitacion: 101, estado: "Sucio", clientes: "Juan Pérez, María López" },
                            { numHabitacion: 102, estado: "Sucio", clientes: "Carlos García" },
                        ]),
                });
            } else if (url.includes("/rooms/markAsClean")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ message: "Habitación marcada como limpia" }),
                });
            } else if (url.includes("/rooms/omitCleaning")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ message: "Limpieza omitida correctamente" }),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        // 📌 Mock del socket
        const mockSocket = {
            getInstance: () => ({
                emit: vi.fn(),
                on: vi.fn(),
                off: vi.fn(),
            }),
        };

        wrapper = mount(DailyCleaningComponent, {
            global: {
                plugins: [router],
                stubs: { "router-link": true },
                provide: { socket: mockSocket }, // ✅ Mock del socket
            },
        });

        await wrapper.vm.fetchDirtyRooms();
        await wrapper.vm.$nextTick();
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar las habitaciones sucias desde la API", async () => {
        expect(wrapper.vm.dirtyRooms.length).toBe(2);
        expect(wrapper.vm.dirtyRooms[0].numHabitacion).toBe(101);
        expect(wrapper.vm.dirtyRooms[1].numHabitacion).toBe(102);
    });

    it("debería mostrar habitaciones sucias en la UI", async () => {
        await wrapper.vm.$nextTick();

        const rows = wrapper.findAll("tbody tr");
        expect(rows.length).toBe(2);
        expect(rows[0].text()).toContain("101SucioNo asignado Limpia  No Limpiar");
        expect(rows[1].text()).toContain("102");
        expect(rows[1].text()).toContain("102SucioNo asignado Limpia  No Limpiar");
    });

    it("debería marcar una habitación como limpia", async () => {
        window.alert = vi.fn();
        wrapper.vm.$router.push = vi.fn();

        await wrapper.findAll(".btn-clean")[0].trigger("click");

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/rooms/markAsClean",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numHabitacion: 101 }),
            })
        );
    });

    it("debería omitir la limpieza de una habitación", async () => {
        window.confirm = vi.fn(() => true);
        window.alert = vi.fn();

        await wrapper.findAll(".btn-no-clean")[0].trigger("click");

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/rooms/omitCleaning",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numHabitacion: 101 }),
            })
        );
    });

    it("debería manejar un error si la API falla al marcar como limpia", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.findAll(".btn-clean")[0].trigger("click");

        expect(console.error).toHaveBeenCalledWith("Error al marcar la habitación como limpia:", expect.any(Error));
    });

    it("debería manejar un error si la API falla al omitir la limpieza", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.findAll(".btn-no-clean")[0].trigger("click");

        expect(console.error).toHaveBeenCalledWith("Error al omitir la limpieza:", expect.any(Error));
    });
});

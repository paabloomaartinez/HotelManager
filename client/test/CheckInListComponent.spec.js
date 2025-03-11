import { mount } from "@vue/test-utils";
import CheckInListComponent from "@/components/Rol_Recep/CheckInListComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reception/checkin/:idReserva/room/:numHabitacion", name: "CheckInRoom" }],
});

describe("CheckInListComponent.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url) => {
            if (url.includes("/reservations/todayCheckIns")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve([
                            {
                                idReserva: "1001",
                                clienteNombre: "Carlos",
                                clienteApellidos: "Fernández",
                                fechaEntrada: "2024-02-05",
                                fechaSalida: "2024-02-10",
                                numHabitacion: "203",
                            },
                        ]),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        wrapper = mount(CheckInListComponent, {
            global: {
                plugins: [router],
                provide: {
                    socket: { getInstance: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) }, // Mock del socket
                },
            },
        });

        await wrapper.vm.$nextTick(); // Asegurar que los datos se carguen antes de la prueba
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar los check-ins desde la API", async () => {
        await wrapper.vm.fetchTodayCheckIns();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.reservations.length).toBe(1);
        expect(wrapper.vm.reservations[0].idReserva).toBe("1001");
    });

    it("debería mostrar los check-ins en la tabla", async () => {
        await wrapper.vm.fetchTodayCheckIns();
        await wrapper.vm.$nextTick();

        const rows = wrapper.findAll("tbody tr");
        expect(rows.length).toBe(1);
        expect(rows[0].text()).toContain("1001");
        expect(rows[0].text()).toContain("Carlos Fernández");
        expect(rows[0].text()).toContain("203");
    });

    it("debería formatear correctamente la fecha", () => {
        const formattedDate = wrapper.vm.formatDate("2024-02-05");
        expect(formattedDate).toBe("5 de febrero de 2024");
    });

    it("debería navegar a la vista de check-in al hacer clic en 'Realizar Check-in'", async () => {
        wrapper.vm.$router.push = vi.fn();

        await wrapper.vm.goToCheckIn("1001", "203");

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reception/checkin/1001/room/203");
    });

    it("debería manejar un error si la API falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.vm.fetchTodayCheckIns();

        expect(console.error).toHaveBeenCalledWith("Error al obtener los check-ins del día:", expect.any(Error));
    });
});

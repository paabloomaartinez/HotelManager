import { mount } from "@vue/test-utils";
import CheckInFormComponent from "@/components/Rol_Recep/CheckInFormComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reception/checkin", name: "CheckInList" }],
});

describe("CheckInFormComponent.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url) => {
            if (url.includes("/rooms/getRoomDetails")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            numCamas: 2,
                            supletoriaReservada: true, // Simulación de una cama extra reservada
                        }),
                });
            } else if (url.includes("/reservations/registerGuestsForRoom")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ message: "Huéspedes registrados con éxito" }),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        wrapper = mount(CheckInFormComponent, {
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
                mocks: {
                    $route: {
                        params: { id: "1001", numHabitacion: "203" },
                    },
                },
            },
        });

        await wrapper.vm.fetchRoomDetails();
        await wrapper.vm.$nextTick();
    });


    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar los detalles de la habitación y configurar los huéspedes", async () => {
        await wrapper.vm.fetchRoomDetails();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.capacidad).toBe(2);
        expect(wrapper.vm.camaSupletoriaReservada).toBe(true);
        expect(wrapper.vm.guests.length).toBe(3); // 2 camas + 1 cama extra
    });

    it("debería mostrar el título con el número de la habitación", async () => {
        await wrapper.vm.$nextTick();
        expect(wrapper.find("h2").text()).toContain("Habitación 203");
    });

    it("debería permitir el ingreso de datos de huéspedes", async () => {
        await wrapper.vm.$nextTick(); // Esperar a que se cargue el DOM

        const inputs = wrapper.findAll("input"); // Buscar todos los campos de entrada

        expect(inputs.length).toBeGreaterThan(0); // Asegurar que haya al menos un campo de entrada

        await inputs[0].setValue("12345678X");
        await inputs[1].setValue("Juan");
        await inputs[2].setValue("Pérez");

        expect(wrapper.vm.guests[0].numeroDocumento).toBe("12345678X");
        expect(wrapper.vm.guests[0].nombre).toBe("Juan");
        expect(wrapper.vm.guests[0].apellidos).toBe("Pérez");
    });

    it("debería enviar los datos de check-in a la API correctamente", async () => {
        wrapper.vm.$router.push = vi.fn();
        await wrapper.vm.submitGuests();

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/reservations/registerGuestsForRoom",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idReserva: "1001",
                    numHabitacion: "203",
                    guests: wrapper.vm.guests,
                }),
            })
        );

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reception/checkin");
    });

    it("debería manejar un error si la API de check-in falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.vm.submitGuests();

        expect(console.error).toHaveBeenCalledWith("Error al registrar los huéspedes:", expect.any(Error));
    });

    it("debería cancelar y volver a la pantalla de check-ins", async () => {
        wrapper.vm.$router.push = vi.fn();
        await wrapper.vm.cancel();

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reception/checkin");
    });
});

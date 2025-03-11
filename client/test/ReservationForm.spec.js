import { mount } from "@vue/test-utils";
import ReservationForm from "@/components/Rol_Recep/ReservationForm.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", name: "Home" },
        { path: "/reception/reservations", name: "ReceptionReservations" },
    ],
});


describe("ReservationForm.vue", () => {
    let wrapper;

    beforeEach(async () => {
        router.push("/");
        await router.isReady();

        wrapper = mount(ReservationForm, {
            global: {
                plugins: [router],
                stubs: {
                    "calendar-month": true,
                    "calendar-range": true,
                    "router-link": true,
                },
                mocks: {
                    $router: {
                        push: vi.fn(), // Mock de navegación
                    },
                    window: {
                        alert: vi.fn(), // Mock de alert
                    },
                },
                provide: {
                    socket: {
                        getInstance: () => ({
                            emit: vi.fn(),
                            on: vi.fn(),
                        }),
                    },
                },
            },
        });
    });

    it("debería renderizar correctamente el formulario", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería permitir ingresar datos en los campos de fecha", async () => {
        await wrapper.setData({
            form: {
                checkInDate: "2025-02-10",
                checkOutDate: "2025-02-15",
                numGuests: 2,
                roomType: "Doble estandar",
                services: [],
            },
        });

        expect(wrapper.vm.form.checkInDate).toBe("2025-02-10");
        expect(wrapper.vm.form.checkOutDate).toBe("2025-02-15");
        expect(wrapper.vm.form.numGuests).toBe(2);
        expect(wrapper.vm.form.roomType).toBe("Doble estandar");
    });

    it("debería permitir seleccionar servicios adicionales", async () => {
        await wrapper.setData({
            form: {
                services: ["Parking", "Desayuno"],
            },
        });

        expect(wrapper.vm.form.services).toContain("Parking");
        expect(wrapper.vm.form.services).toContain("Desayuno");
    });

    it("debería buscar habitaciones disponibles al hacer clic en 'Buscar Habitaciones'", async () => {
        // Mock de fetch para la búsqueda de habitaciones
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve([
                        { Numero: 101, Tipo: "Doble", Num_camas: 1, Tarifa: 120 },
                        { Numero: 102, Tipo: "Suite", Num_camas: 2, Tarifa: 200 },
                    ]),
            })
        );

        await wrapper.setData({
            form: {
                checkInDate: "2025-02-10",
                checkOutDate: "2025-02-15",
                numGuests: 2,
                roomType: "Doble estandar",
                services: [],
            },
        });

        await wrapper.find(".button-primary").trigger("click");
        await new Promise((resolve) => setTimeout(resolve, 500)); // Esperar la respuesta simulada

        expect(wrapper.vm.availableRooms.length).toBe(2);
        expect(wrapper.vm.availableRooms[0].Numero).toBe(101);
        expect(wrapper.vm.availableRooms[1].Numero).toBe(102);
    });

    it("debería permitir seleccionar habitaciones", async () => {
        await wrapper.setData({
            availableRooms: [
                { Numero: 101, Tipo: "Doble", Num_camas: 1, Tarifa: 120 },
                { Numero: 102, Tipo: "Suite", Num_camas: 2, Tarifa: 200 },
            ],
            isRoomsSearched: true,
        });

        const roomCards = wrapper.findAll(".room-card");
        await roomCards[0].trigger("click");

        expect(wrapper.vm.selectedRooms.length).toBe(1);
        expect(wrapper.vm.selectedRooms[0].Numero).toBe(101);
    });

    it("debería enviar la reserva correctamente", async () => {
        // Mock de fetch para enviar la reserva
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })
        );

        await wrapper.setData({
            selectedRooms: [{ Numero: 101, Tarifa: 120, Tipo: "Doble" }],
            form: {
                checkInDate: "2025-02-10",
                checkOutDate: "2025-02-15",
                numGuests: 2,
                roomType: "Doble estandar",
                services: ["Parking"],
            },
            customerData: {
                fullName: "Juan Pérez",
                email: "juan@example.com",
                phone: "123456789",
                notes: "",
            },
            showCustomerForm: true,
        });

        await wrapper.find("form").trigger("submit.prevent");
        await new Promise((resolve) => setTimeout(resolve, 500)); // Esperar la respuesta simulada

        expect(global.fetch).toHaveBeenCalled();
        expect(wrapper.vm.selectedRooms.length).toBe(0); // Form reseteado
    });
});

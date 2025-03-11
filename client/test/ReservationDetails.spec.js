import { mount } from "@vue/test-utils";
import ReservationDetails from "@/components/Rol_Recep/ReservationDetails.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reception/reservations", name: "ReceptionReservations" }],
});

describe("ReservationDetails.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.alert = vi.fn();
        global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

        router.push = vi.fn(); // ✅ Mock de `router.push`

        wrapper = mount(ReservationDetails, {
            global: {
                plugins: [router],
                stubs: { "calendar-month": true, "calendar-range": true, "router-link": true },
                mocks: {
                    $router: { push: vi.fn() }, // ✅ Mock de navegación
                    window: { alert: vi.fn(), confirm: vi.fn(() => true) },
                },
                provide: {
                    socket: { getInstance: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) },
                },
            },
        });
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar los detalles de la reserva correctamente", async () => {
        // Asignamos los datos de la reserva
        await wrapper.setData({
            reservation: {
                idReserva: "12345",
                clienteNombre: "Juan Pérez",
                fechaEntrada: "2025-02-10",
                fechaSalida: "2025-02-15",
                numPersonas: 2,
                estado: "Confirmada",
                habitaciones: [
                    { numHabitacion: 101, tipoHabitacion: "Doble" },
                    { numHabitacion: 202, tipoHabitacion: "Suite" }
                ],
                servicios: ["Parking", "Desayuno"],
                precio: 500,
            },
        });

        await wrapper.vm.$nextTick();

        // ✅ Verificamos que la sección de la reserva existe
        const summary = wrapper.find(".summary-item");
        expect(summary.exists()).toBe(true);

        expect(summary.text()).toContain("Localizador:");
        expect(summary.text()).toContain("Cliente:");
        expect(summary.text()).toContain("Fecha de Entrada:");
        expect(summary.text()).toContain("Fecha de Salida:");
        expect(summary.text()).toContain("Número de Personas:");
        expect(summary.text()).toContain("Estado:");
    });

    it("debería mostrar las opciones de modificación al hacer clic en 'Modificar Reserva'", async () => {
        await wrapper.find(".button-primary").trigger("click");
        expect(wrapper.vm.showModificationOptions).toBe(true);
    });

    it("debería permitir modificar las fechas de la reserva", async () => {
        await wrapper.setData({ showModificationOptions: true });

        const buttons = wrapper.findAll("button");
        const modifyDatesButton = buttons.find(btn => btn.text() === "Fechas de Entrada y Salida");

        expect(modifyDatesButton.exists()).toBe(true);
        await modifyDatesButton.trigger("click");

        expect(wrapper.vm.showCalendarForm).toBe(true);
    });

    it("debería permitir modificar los servicios adicionales", async () => {
        await wrapper.setData({ showModificationOptions: true });

        const buttons = wrapper.findAll("button");
        const modifyServicesButton = buttons.find(btn => btn.text() === "Servicios Contratados");

        expect(modifyServicesButton.exists()).toBe(true);
        await modifyServicesButton.trigger("click");

        expect(wrapper.vm.showServices).toBe(true);
    });

    it("debería permitir modificar el número de personas", async () => {
        await wrapper.setData({ showModificationOptions: true });

        const buttons = wrapper.findAll("button");
        const modifyPersonsButton = buttons.find(btn => btn.text() === "Número de Personas");

        expect(modifyPersonsButton.exists()).toBe(true);
        await modifyPersonsButton.trigger("click");

        expect(wrapper.vm.showPersonsForm).toBe(true);
    });

    it("debería permitir modificar las habitaciones", async () => {
        await wrapper.setData({
            showModificationOptions: true,
            availableRooms: [] // ✅ Limpiar habitaciones antes de la prueba
        });

        const buttons = wrapper.findAll("button");
        const modifyRoomsButton = buttons.find(btn => btn.text() === "Habitaciones");

        expect(modifyRoomsButton.exists()).toBe(true);
        await modifyRoomsButton.trigger("click");

        expect(wrapper.vm.showRooms).toBe(true);

        await wrapper.setData({
            availableRooms: [
                { Numero: 101, Tipo: "Doble", Tarifa: 120 },
                { Numero: 102, Tipo: "Suite", Tarifa: 200 },
            ]
        });

        // 📌 Esperar a que el DOM se actualice
        await wrapper.vm.$nextTick();

        // ✅ Verificar que hay exactamente 2 habitaciones
        const roomCards = wrapper.findAll(".room-card");
        expect(roomCards.length).toBe(3);

        await roomCards[1].trigger("click");

        expect(wrapper.vm.selectedRooms.length).toBe(1);

        expect(global.fetch).toHaveBeenCalled();
    });

    it("debería permitir cancelar la reserva", async () => {
        global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: "Reserva cancelada" }) });

        const buttons = wrapper.findAll("button");
        const cancelButton = buttons.find(btn => btn.text() === "Cancelar Reserva");

        expect(cancelButton.exists()).toBe(true);
        await cancelButton.trigger("click");

        expect(global.fetch).toHaveBeenCalled();
    });
});

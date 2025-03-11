import { mount } from "@vue/test-utils";
import ReservationDetailsComponent from "@/components/Rol_Client/ReservationDetailsComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reservations/:id", name: "ReservationDetails" }],
});

describe("ReservationDetailsComponent.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url) => {
            if (url.includes("/reservations/getReservationDetails")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            idReserva: "1234",
                            clienteNombre: "Juan Pérez",
                            fechaEntrada: "2024-06-01",
                            fechaSalida: "2024-06-07",
                            numPersonas: 2,
                            estado: "Finalizada",
                            habitaciones: [{ numHabitacion: "101", tipoHabitacion: "Doble" }],
                            servicios: ["Desayuno", "Wi-Fi"],
                            precio: 500.0,
                        }),
                });
            } else if (url.includes("/config/paypal")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ clientId: "test-client-id" }),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        wrapper = mount(ReservationDetailsComponent, {
            global: {
                plugins: [router],
                stubs: { "router-link": true }, // Evitar errores de rutas
                mocks: {
                    $route: {
                        params: { id: "1234" },
                    },
                },
            },
        });

        await wrapper.vm.$nextTick(); // Asegurar que los datos se carguen antes de la prueba
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar los detalles de la reserva desde la API", async () => {
        await wrapper.vm.fetchReservationDetails();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.reservation.idReserva).toBe("1234");
        expect(wrapper.vm.reservation.clienteNombre).toBe("Juan Pérez");
        expect(wrapper.vm.reservation.numPersonas).toBe(2);
        expect(wrapper.vm.reservation.estado).toBe("Finalizada");
        expect(wrapper.vm.reservation.precio).toBe(500.0);
    });

    it("debería mostrar el localizador de la reserva en la UI", () => {
        expect(wrapper.text()).toContain("Localizador: 1234");
    });

    it("debería mostrar la información del cliente en la UI", () => {
        expect(wrapper.text()).toContain("Cliente: Juan Pérez");
    });

    it("debería mostrar las habitaciones reservadas en la UI", () => {
        expect(wrapper.text()).toContain("Número: 101 (Doble)");
    });

    it("debería mostrar los servicios contratados en la UI", () => {
        expect(wrapper.text()).toContain("Servicios Contratados");
        expect(wrapper.text()).toContain("Desayuno");
        expect(wrapper.text()).toContain("Wi-Fi");
    });

    it("debería mostrar el precio total en la UI", () => {
        expect(wrapper.text()).toContain("Precio Total: €500");
    });

    it("debería mostrar el botón de factura si la reserva está finalizada", () => {
        expect(wrapper.find(".btn-open").exists()).toBe(true);
    });

    it("debería intentar cargar el script de PayPal si la reserva está finalizada", async () => {
        await wrapper.vm.loadPayPalScript();
        expect(global.fetch).toHaveBeenCalledWith("http://localhost:3000/config/paypal");
    });

    it("debería manejar un error si la API de detalles de la reserva falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.vm.fetchReservationDetails();

        expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it("debería redirigir al usuario al cerrar sesión", async () => {
        wrapper.vm.$router.push = vi.fn();

        await wrapper.vm.logout();

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reservations/1234");
    });
});

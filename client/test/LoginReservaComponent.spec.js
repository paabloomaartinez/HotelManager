import { mount } from "@vue/test-utils";
import LoginReservaComponent from "@/components/Rol_Client/LoginReservaComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reservations/details/:id", name: "ReservationDetails" }],
});

describe("LoginReservaComponent.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url, options) => {
            if (url.includes("/reservations/getReservation") && options.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            reserva: { idReserva: "1234" },
                            token: "mock-token",
                        }),
                });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        wrapper = mount(LoginReservaComponent, {
            global: {
                plugins: [router],
                stubs: { "router-link": true }, // Evita errores de rutas
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

    it("debería inicializar el localizador desde la ruta", () => {
        expect(wrapper.vm.lookup.localizador).toBe("1234");
    });

    it("debería permitir la entrada de datos en los campos de formulario", async () => {
        const emailInput = wrapper.find("#email");
        await emailInput.setValue("test@example.com");

        expect(wrapper.vm.lookup.email).toBe("test@example.com");
    });

    it("debería deshabilitar el botón cuando `isLoading` está activo", async () => {
        await wrapper.setData({ isLoading: true });
        const button = wrapper.find("button");

        expect(button.element.disabled).toBe(true);
    });

    it("debería mostrar un mensaje de error si los campos están vacíos", async () => {
        await wrapper.setData({ lookup: { localizador: "", email: "" } });
        await wrapper.vm.handleLookup();

        expect(wrapper.vm.errorMessage).toBe("Por favor, completa todos los campos");
    });

    it("debería realizar una llamada a la API y almacenar el token en sessionStorage", async () => {
        await wrapper.setData({
            lookup: { localizador: "1234", email: "test@example.com" },
        });

        await wrapper.vm.handleLookup();

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/reservations/getReservation",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    localizador: "1234",
                    email: "test@example.com",
                }),
            })
        );

        expect(sessionStorage.getItem("token")).toBe("mock-token");
    });

    it("debería redirigir al usuario a la página de detalles de la reserva tras el éxito", async () => {
        wrapper.vm.$router.push = vi.fn();

        await wrapper.setData({
            lookup: { localizador: "1234", email: "test@example.com" },
        });

        await wrapper.vm.handleLookup();

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith({
            path: "/reservations/details/1234",
        });
    });

    it("debería manejar un error si la API falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.setData({
            lookup: { localizador: "1234", email: "test@example.com" },
        });

        await wrapper.vm.handleLookup();

        expect(console.error).toHaveBeenCalledWith(
            "Error al consultar la reserva:",
            expect.any(Error)
        );
        expect(wrapper.vm.errorMessage).toBe(
            "Error de conexión o en el servidor. Inténtalo nuevamente más tarde."
        );
    });
});

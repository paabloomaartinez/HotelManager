import { mount } from "@vue/test-utils";
import CleaningDashboardComponent from "@/components/Rol_Mant/CleaningDashboardComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/cleaning/daily-cleaning", name: "DailyCleaning" },
        { path: "/rooms", name: "ManageRooms" },
    ],
});

describe("CleaningDashboardComponent.vue", () => {
    let wrapper;

    beforeEach(() => {
        wrapper = mount(CleaningDashboardComponent, {
            global: {
                plugins: [router],
                stubs: { "router-link": true }, // Evitar errores de rutas
            },
        });

        wrapper.vm.$router.push = vi.fn(); // Mock para el router push
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería mostrar el título correctamente", () => {
        expect(wrapper.find("h2").text()).toBe("Panel de Limpieza / Mantenimiento");
    });

    it("debería mostrar dos tarjetas en la UI", () => {
        const cards = wrapper.findAll(".card");
        expect(cards.length).toBe(2);
    });

    it("debería navegar a la pantalla de limpieza diaria al hacer clic en la tarjeta correspondiente", async () => {
        await wrapper.findAll(".card")[0].trigger("click");

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/cleaning/daily-cleaning");
    });

    it("debería navegar a la pantalla de gestión de habitaciones al hacer clic en la tarjeta correspondiente", async () => {
        await wrapper.findAll(".card")[1].trigger("click");

        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/rooms");
    });
});

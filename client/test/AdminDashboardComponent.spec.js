import { mount } from "@vue/test-utils";
import AdminDashboardComponent from "@/components/Rol_Admin/AdminDashboardComponent.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/admin/employee", name: "ManageEmployees" },
        { path: "/admin/reports", name: "ManageReports" }
    ],
});

describe("AdminDashboardComponent.vue", () => {
    let wrapper;

    beforeEach(() => {
        wrapper = mount(AdminDashboardComponent, {
            global: {
                plugins: [router],
            },
        });
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.find("h2").text()).toBe("Panel de Administrador");
    });

    it("debería navegar a la gestión de empleados al hacer clic en la tarjeta", async () => {
        wrapper.vm.$router.push = vi.fn(); // Mock de router.push

        await wrapper.find(".card:nth-child(1)").trigger("click"); // Click en la primera card
        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/admin/employee");
    });

    it("debería navegar a la generación de informes al hacer clic en la tarjeta", async () => {
        wrapper.vm.$router.push = vi.fn(); // Mock de router.push

        await wrapper.find(".card:nth-child(2)").trigger("click"); // Click en la segunda card
        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/admin/reports");
    });

    it("debería mostrar un mensaje de alerta para futuras características", async () => {
        global.alert = vi.fn();

        await wrapper.vm.moreFeatures();

        expect(global.alert).toHaveBeenCalledWith("Esta funcionalidad está en construcción. ¡Pronto habrá más!");
    });
});

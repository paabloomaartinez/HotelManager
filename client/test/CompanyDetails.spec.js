import { mount } from "@vue/test-utils";
import CompanyDetails from "@/components/Rol_Recep/CompanyDetails.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/reception/companies", name: "ReceptionCompanies" }],
});

describe("CompanyDetails.vue", () => {
    let wrapper;

    beforeEach(() => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    NIF: "B12345678",
                    razonSocial: "Empresa S.A.",
                    nombreComercial: "Empresa",
                    direccionFiscal: "Calle Empresa 456",
                    codigoPostal: "28001",
                }),
            })
        );

        wrapper = mount(CompanyDetails, {
            global: {
                plugins: [router],
                stubs: { "router-link": true },
                provide: {
                    socket: { getInstance: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) }, // ✅ Mock del socket
                },
            },
        });
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar los detalles de la empresa correctamente", async () => {
        // Simula que los datos han sido obtenidos de la API
        await wrapper.setData({
            company: {
                NIF: "B12345678",
                razonSocial: "Empresa S.A.",
                nombreComercial: "Empresa",
                direccionFiscal: "Calle Empresa 456",
                codigoPostal: "28001",
            },
        });

        await wrapper.vm.$nextTick(); // Asegurar la actualización del DOM

        // 📌 Verificar que la información se muestra en la UI
        expect(wrapper.text()).toContain("B12345678");
        expect(wrapper.text()).toContain("Empresa S.A.");
        expect(wrapper.text()).toContain("Empresa");
        expect(wrapper.text()).toContain("Calle Empresa 456");
        expect(wrapper.text()).toContain("28001");
    });

    it("debería manejar correctamente un error en la API", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error al obtener los detalles de la empresa"));

        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

        await wrapper.vm.fetchCompanyDetails();

        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls[0][0]).toContain("Error al obtener los detalles de la empresa");

        consoleSpy.mockRestore();
    });

    it("debería navegar de vuelta cuando se hace clic en el botón 'Volver Atrás'", async () => {
        wrapper.vm.$router.go = vi.fn();

        await wrapper.find(".btn-back").trigger("click");

        expect(wrapper.vm.$router.go).toHaveBeenCalledWith(-1);
    });
});

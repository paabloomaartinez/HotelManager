import { mount } from "@vue/test-utils";
import AdminReports from "@/components/Rol_Admin/AdminReports.vue";
import { describe, it, beforeEach, expect, vi } from "vitest";

describe("AdminReports.vue", () => {
    let wrapper;

    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.includes("lista-policia")) {
                return Promise.resolve({
                    ok: true,
                    blob: () => Promise.resolve(new Blob(["mock PDF content"], { type: "application/pdf" })),
                });
            }
            return Promise.reject(new Error("No se encontraron datos."));
        });

        // Mock `window.URL.createObjectURL` si no está definido
        if (!window.URL.createObjectURL) {
            window.URL.createObjectURL = vi.fn();
        }

        wrapper = mount(AdminReports, {
            global: {
                stubs: { HeaderComponent: true },
            },
        });
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería deshabilitar el botón si no se ha seleccionado un informe", async () => {
        const button = wrapper.find("button");
        expect(button.attributes("disabled")).toBe("");
    });

    it("debería habilitar el botón al seleccionar un informe", async () => {
        await wrapper.find("select").setValue("lista-policia");
        const button = wrapper.find("button");
        expect(button.attributes("disabled")).toBeUndefined();
    });

    it("debería llamar a `fetch` con la URL correcta al descargar un informe", async () => {
        // Mock para simular el evento `click` en un enlace de descarga
        const link = document.createElement("a");
        document.body.appendChild(link);
        vi.spyOn(link, "click").mockImplementation(() => { });

        await wrapper.find("select").setValue("lista-policia");
        await wrapper.find("button").trigger("click");

        expect(global.fetch).toHaveBeenCalledWith("http://localhost:3000/lista-policia");
        expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it("debería manejar un error si la API falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("No se encontraron datos."));
        console.error = vi.fn();

        await wrapper.find("select").setValue("lista-policia");
        await wrapper.find("button").trigger("click");

        expect(console.error).toHaveBeenCalledWith("Error al descargar el informe:", expect.any(Error));
    });
});

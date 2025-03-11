import { mount } from "@vue/test-utils";
import Employee from "@/components/Rol_Admin/Employee.vue";
import { createRouter, createWebHistory } from "vue-router";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 Mock del router
const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/admin/employees", name: "EmployeeList" }],
});

describe("Employee.vue", () => {
    let wrapper;

    beforeEach(async () => {
        global.fetch = vi.fn((url, options) => {
            if (url.includes("/admin/employees/getEmployees")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve([
                            {
                                Nombre: "Juan",
                                Apellidos: "Pérez",
                                Tipo_documento: "DNI",
                                Numero_documento: "12345678X",
                                Rol: "Recepcionista",
                                Usuario: "juanperez",
                            },
                        ]),
                });
            } else if (url.includes("/admin/employees/addEmployee") && options.method === "POST") {
                return Promise.resolve({ ok: true });
            } else if (url.includes("/admin/employees/updateEmployee") && options.method === "PUT") {
                return Promise.resolve({ ok: true });
            } else if (url.includes("/admin/employees/deleteEmployee") && options.method === "DELETE") {
                return Promise.resolve({ ok: true });
            }
            return Promise.reject(new Error("Error en la API"));
        });

        wrapper = mount(Employee, {
            global: {
                plugins: [router],
                stubs: { "router-link": true }, // Evita errores de rutas
                provide: {
                    socket: { getInstance: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) },
                },
            },
        });

        await wrapper.vm.$nextTick(); // Asegurar que los datos se carguen antes de la prueba
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería cargar la lista de empleados desde la API", async () => {
        await wrapper.vm.fetchEmployees();
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.empleados.length).toBe(1);
        expect(wrapper.vm.empleados[0].Nombre).toBe("Juan");
    });

    it("debería abrir el modal de añadir empleado", async () => {
        wrapper.vm.showAddEmployeeModal = true;
        await wrapper.vm.$nextTick();

        expect(wrapper.find(".modal").exists()).toBe(true);
    });

    it("debería habilitar el modo edición y guardar cambios", async () => {
        wrapper.vm.editingId = "12345678X";
        wrapper.vm.toggleEdit(wrapper.vm.empleados[0]);

        expect(wrapper.vm.editingId).toBe("12345678X");

        wrapper.vm.editableEmployee.Nombre = "Juan Modificado";
        await wrapper.vm.updateEmployee();

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/admin/employees/updateEmployee",
            expect.objectContaining({
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(wrapper.vm.editableEmployee),
            })
        );
    });

    it("debería eliminar un empleado", async () => {
        global.confirm = vi.fn(() => true);
        await wrapper.vm.deleteEmployee("12345678X");

        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/admin/employees/deleteEmployee/12345678X",
            expect.objectContaining({
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            })
        );
    });

    it("debería manejar un error si la API falla", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Error en la API"));

        console.error = vi.fn();

        await wrapper.vm.fetchEmployees();

        expect(console.error).toHaveBeenCalledWith("Error al obtener empleados:", expect.any(Error));
    });
});

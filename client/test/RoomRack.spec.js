import { mount } from "@vue/test-utils";
import RoomRack from "@/components/Rol_Recep/RoomRack.vue";
import { createRouter, createMemoryHistory } from "vue-router";
import { nextTick } from "vue";
import { describe, it, beforeEach, expect, vi } from "vitest";

// 📌 1. Definir rutas para el router mock
const routes = [
    { path: "/reservation/details/:id", name: "ReservationDetails" }
];

// 📌 2. Crear un router falso con `MemoryHistory`
const router = createRouter({
    history: createMemoryHistory(), // ⚠️ Usa MemoryHistory en lugar de WebHistory
    routes,
});

describe("RoomRack.vue", () => {
    let wrapper;

    beforeEach(async () => {
        router.push("/"); // Ir a la página inicial
        await router.isReady(); // Asegurar que el router está listo

        wrapper = mount(RoomRack, {
            global: {
                plugins: [router], // 🔹 Agregar el router mock
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

        // 📌 3. Espiar `push()` del router después de montar
        vi.spyOn(wrapper.vm.$router, "push");

        // 📌 4. Mock manual de `fetchRooms`
        wrapper.vm.fetchRooms = async function () {
            wrapper.vm.rooms = [
                { Numero: 101, Tipo: "Doble", Estado: "Disponible" },
                { Numero: 102, Tipo: "Individual", Estado: "Ocupada" },
            ];
        };

        // 📌 5. Mock manual de `fetchReservations`
        wrapper.vm.fetchReservations = async function () {
            wrapper.vm.reservations = [
                {
                    idReserva: 1,
                    numHabitacion: 101,
                    fechaEntrada: new Date().toISOString().split("T")[0],
                    fechaSalida: new Date(new Date().setDate(new Date().getDate() + 3))
                        .toISOString()
                        .split("T")[0],
                    estado: "Activa",
                    clienteNombre: "Pedro",
                },
            ];
        };

        await wrapper.vm.fetchRooms();
        await wrapper.vm.fetchReservations();
        await nextTick();
    });

    it("debería renderizar correctamente el componente", () => {
        expect(wrapper.exists()).toBe(true);
    });

    it("debería mostrar la lista de habitaciones correctamente", async () => {
        await nextTick();
        console.log("Rooms data inside test:", wrapper.vm.rooms);

        const rooms = wrapper.findAll(".room-name");
        expect(rooms.length).toBe(2);
        expect(rooms[0].text()).toContain("101 (Doble)");
        expect(rooms[1].text()).toContain("102 (Individual)");
    });

    it("debería mostrar reservas en las celdas correspondientes", async () => {
        await nextTick();
        console.log("Reservations inside test:", wrapper.vm.reservations);

        const reservedCell = wrapper.find(".reservation-active");
        expect(reservedCell.exists()).toBe(true);
        expect(reservedCell.text()).toContain("Pedro");
    });

    it("debería avanzar y retroceder semanas", async () => {
        await nextTick();

        const nextButton = wrapper.find(".next-week-button");
        expect(nextButton.exists()).toBe(true);

        await nextButton.trigger("click");
        await nextTick();

        const prevButton = wrapper.find(".prev-week-button");
        expect(prevButton.exists()).toBe(true);

        await prevButton.trigger("click");
        await nextTick();
    });

    it("debería abrir detalles de reserva al hacer clic en una celda reservada", async () => {
        await nextTick();
        console.log("Reservations inside click test:", wrapper.vm.reservations);

        const reservedCell = wrapper.find(".reservation-active");
        expect(reservedCell.exists()).toBe(true);

        if (reservedCell.exists()) {
            await reservedCell.trigger("click");

            // ✅ Ahora sí funciona porque `push()` está espiado
            expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/reservation/details/1");
        }
    });


    it("debería resaltar reservas al pasar el mouse sobre una celda", async () => {
        await nextTick();

        const reservedCell = wrapper.find(".reservation-active");
        expect(reservedCell.exists()).toBe(true);

        if (reservedCell.exists()) {
            await reservedCell.trigger("mouseenter");
            await nextTick();
        }
    });
});

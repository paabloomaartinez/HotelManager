import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import RoomComponent from '../src/components/RoomComponent.vue'
import HeaderComponent from '../src/components/Header/HeaderComponent.vue'

// Simulamos el socket para evitar errores de inyección
const mockSocket = {
    getInstance: vi.fn(() => ({
        id: "mock-socket-id",
        connected: true,
        on: vi.fn(),
        emit: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn()
    })),
    connect: vi.fn()
}

describe('RoomComponent', () => {
    let wrapper
    let mockFetch

    beforeEach(async () => {
        // Mock de fetch para simular respuesta de la API de habitaciones
        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve([
                    { Numero: 101, Estado: 'Disponible', Tipo: 'Doble estandar', Num_camas: 2, Opcion_supletoria: 'Sí' },
                    { Numero: 102, Estado: 'Ocupada', Tipo: 'Suite', Num_camas: 1, Opcion_supletoria: 'No' },
                ]),
        })
        global.fetch = mockFetch

        wrapper = mount(RoomComponent, {
            global: {
                components: {
                    HeaderComponent,
                },
                provide: {
                    socket: mockSocket
                },
                stubs: {
                    'router-link': {
                        template: '<a><slot></slot></a>',
                    },
                }
            }
        })

        // Esperar a que el componente termine de renderizar
        await wrapper.vm.$nextTick()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('debería renderizar correctamente el HeaderComponent', () => {
        expect(wrapper.findComponent(HeaderComponent).exists()).toBe(true)
    })

    it('debería cargar las habitaciones desde la API al montarse', async () => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/rooms/getRooms')
        expect(wrapper.vm.rooms.length).toBe(2) // Deben cargarse las 2 habitaciones mockeadas
    })

    it('debería filtrar habitaciones por tipo', async () => {
        // Simulamos seleccionar el filtro "Doble estandar"
        await wrapper.setData({ selectedTypes: ['Doble estandar'] })
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.filteredRooms.length).toBe(1)
        expect(wrapper.vm.filteredRooms[0].Tipo).toBe('Doble estandar')
    })

    it('debería mostrar todas las habitaciones si no hay filtros aplicados', async () => {
        await wrapper.setData({ selectedTypes: [] })
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.filteredRooms.length).toBe(2)
    })

    it('debería habilitar el modo edición al hacer clic en el icono de edición', async () => {
        const editIcon = wrapper.find('.edit-icon')

        await editIcon.trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.isEditing(wrapper.vm.rooms[0])).toBe(true)
        expect(wrapper.vm.editingId).toBe(101)
    })

    it('debería cancelar la edición al hacer clic en el icono de cancelar', async () => {
        await wrapper.setData({ editingId: 101 })

        const cancelIcon = wrapper.find('.cancel-icon')
        await cancelIcon.trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.editingId).toBe(null)
    })

    it('debería actualizar el estado de la habitación al hacer clic en guardar', async () => {
        // Mock de fetch para actualizar habitación
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
        });

        await wrapper.setData({
            editingId: 101,
            editableRoom: { Numero: 101, Estado: 'Ocupada', Tipo: 'Doble estandar', Num_camas: 2, Opcion_supletoria: 'Sí' },
        });

        const saveIcon = wrapper.find('.save-icon')
        await saveIcon.trigger('click')

        // Esperar que el fetch termine y los cambios se reflejen
        await new Promise(resolve => setTimeout(resolve, 100)); // Simula la espera de la respuesta del backend
        await wrapper.vm.$nextTick()

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:3000/rooms/setRoomState/',
            expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify(wrapper.vm.editableRoom),
            })
        );

        // Forzar actualización y comprobar que editingId es null
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.editingId).toBe(null)
    });

})
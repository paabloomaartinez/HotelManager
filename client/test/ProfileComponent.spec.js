import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ProfileComponent from '../src/components/ProfileComponent.vue'
import HeaderComponent from '../src/components/Header/HeaderComponent.vue'
import { jwtDecode } from 'jwt-decode'

// 🔹 Mock de jwtDecode
vi.mock('jwt-decode', () => ({
    jwtDecode: vi.fn()
}))

describe('ProfileComponent', () => {
    let wrapper

    beforeEach(() => {
        sessionStorage.setItem('user', JSON.stringify({
            nombre: "Juan",
            apellidos: "Pérez",
            nombreUsuario: "juanp",
            rol: "Administrador"
        }))
        sessionStorage.setItem('token', 'fakeToken')

        jwtDecode.mockReturnValue({ rol: "Administrador" })

        wrapper = mount(ProfileComponent, {
            global: {
                components: {
                    HeaderComponent
                },
                provide: {
                    socket: {
                        getInstance: vi.fn(() => ({
                            id: "mock-socket-id",
                            connected: true,
                            on: vi.fn(),
                            emit: vi.fn(),
                            connect: vi.fn(),
                            disconnect: vi.fn()
                        }))
                    }
                },
                stubs: {
                    'router-link': {
                        template: '<a><slot></slot></a>'
                    },
                    'router-view': true
                }
            }
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
        sessionStorage.clear()
    })

    it('debería renderizar correctamente el HeaderComponent', () => {
        expect(wrapper.findComponent(HeaderComponent).exists()).toBe(true)
    })

    it('debería mostrar la información del usuario correctamente', () => {
        expect(wrapper.text()).toContain("Juan Pérez")
        expect(wrapper.text()).toContain("juanp")
        expect(wrapper.text()).toContain("Administrador")
    })

    it('debería abrir y cerrar el modal de cambio de contraseña', async () => {
        await wrapper.find('button:nth-child(1)').trigger('click')
        expect(wrapper.vm.isPasswordModalOpen).toBe(true)
        await wrapper.find('.modal-content button:nth-child(2)').trigger('click')
        expect(wrapper.vm.isPasswordModalOpen).toBe(false)
    })

    it('debería abrir y cerrar el modal de cambio de rol si el usuario es administrador', async () => {
        await wrapper.find('button:nth-child(2)').trigger('click')
        expect(wrapper.vm.isRoleModalOpen).toBe(true)
        await wrapper.find('.modal-content button:nth-child(2)').trigger('click')
        expect(wrapper.vm.isRoleModalOpen).toBe(false)
    })

    it('debería no mostrar el botón de cambio de rol si el usuario no es administrador', async () => {
        sessionStorage.setItem('user', JSON.stringify({ rol: "Recepcionista" }));
        jwtDecode.mockReturnValue({ rol: "Recepcionista" });

        wrapper = mount(ProfileComponent, {
            global: {
                provide: {
                    socket: {
                        getInstance: vi.fn(() => ({
                            id: "mock-socket-id",
                            connected: true,
                            on: vi.fn(),
                            emit: vi.fn(),
                            connect: vi.fn(),
                            disconnect: vi.fn()
                        }))
                    }
                }
            }
        });

        await wrapper.vm.$nextTick();

        const buttons = wrapper.findAll('button').map(btn => btn.text());

        expect(buttons).not.toContain('Cambiar Rol');
    });

    it('debería hacer logout correctamente y redirigir al login', async () => {
        wrapper.vm.$router = { push: vi.fn() }
        await wrapper.find('button:last-child').trigger('click')

        expect(sessionStorage.getItem('token')).toBeNull()
        expect(sessionStorage.getItem('user')).toBeNull()
        expect(wrapper.vm.$router.push).toHaveBeenCalledWith("/")
    })
})

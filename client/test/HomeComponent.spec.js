import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import HomeComponent from '../src/components/HomeComponent.vue'
import HeaderComponent from '../src/components/Header/HeaderComponent.vue'
import AdminDashboardComponent from '../src/components/Rol_Admin/AdminDashboardComponent.vue'
import ReceptionDashboardComponent from '../src/components/Rol_Recep/ReceptionDashboardComponent.vue'
import CleaningDashboardComponent from '../src/components/Rol_Mant/CleaningDashboardComponent.vue'
import ChatComponent from '../src/components/ChatComponent.vue'
import { jwtDecode } from 'jwt-decode'

vi.mock('jwt-decode', () => ({
    jwtDecode: vi.fn()
}))

describe('HomeComponent', () => {
    let wrapper

    beforeEach(() => {
        wrapper = mount(HomeComponent, {
            global: {
                components: {
                    HeaderComponent,
                    AdminDashboardComponent,
                    ReceptionDashboardComponent,
                    CleaningDashboardComponent,
                    ChatComponent
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
                        })),
                        connect: vi.fn()
                    }
                },
                stubs: {
                    'router-link': {
                        template: '<a><slot></slot></a>' // 🔹 Simula <router-link>
                    },
                    'router-view': true
                }
            }
        })

        // ✅ Mock de los subcomponentes
        vi.mock('../src/components/Header/HeaderComponent.vue', () => ({
            default: { template: '<div />' },
        }));
        vi.mock('../src/components/Rol_Admin/AdminDashboardComponent.vue', () => ({
            default: { template: '<div />' },
        }));
        vi.mock('../src/components/Rol_Recep/ReceptionDashboardComponent.vue', () => ({
            default: { template: '<div />' },
        }));
        vi.mock('../src/components/Rol_Mant/CleaningDashboardComponent.vue', () => ({
            default: { template: '<div />' },
        }));
        vi.mock('../src/components/ChatComponent.vue', () => ({
            default: { template: '<div />' },
        }));
    })

    afterEach(() => {
        vi.restoreAllMocks()
        sessionStorage.clear()
    })

    it('debería renderizar correctamente el HeaderComponent', () => {
        expect(wrapper.findComponent(HeaderComponent).exists()).toBe(true)
    })

    it('debería renderizar el AdminDashboardComponent si el usuario es Administrador', async () => {
        jwtDecode.mockReturnValue({ rol: 'Administrador' })
        sessionStorage.setItem('token', 'fakeToken')

        wrapper = mount(HomeComponent)
        await wrapper.vm.$nextTick()

        expect(wrapper.findComponent(AdminDashboardComponent).exists()).toBe(true)
        expect(wrapper.findComponent(ReceptionDashboardComponent).exists()).toBe(false)
        expect(wrapper.findComponent(CleaningDashboardComponent).exists()).toBe(false)
    })

    it('debería renderizar el ReceptionDashboardComponent si el usuario es Recepcionista', async () => {
        jwtDecode.mockReturnValue({ rol: 'Recepcionista' })
        sessionStorage.setItem('token', 'fakeToken')

        wrapper = mount(HomeComponent)
        await wrapper.vm.$nextTick()

        expect(wrapper.findComponent(ReceptionDashboardComponent).exists()).toBe(true)
        expect(wrapper.findComponent(AdminDashboardComponent).exists()).toBe(false)
        expect(wrapper.findComponent(CleaningDashboardComponent).exists()).toBe(false)
    })

    it('debería renderizar el CleaningDashboardComponent si el usuario es de Limpieza y Mantenimiento', async () => {
        jwtDecode.mockReturnValue({ rol: 'LimpiezaYMantenimiento' })
        sessionStorage.setItem('token', 'fakeToken')

        wrapper = mount(HomeComponent)
        await wrapper.vm.$nextTick()

        expect(wrapper.findComponent(CleaningDashboardComponent).exists()).toBe(true)
        expect(wrapper.findComponent(AdminDashboardComponent).exists()).toBe(false)
        expect(wrapper.findComponent(ReceptionDashboardComponent).exists()).toBe(false)
    })

    it('debería mostrar la sección general si el usuario no tiene un rol válido', async () => {
        jwtDecode.mockReturnValue({ rol: 'OtroRol' })
        sessionStorage.setItem('token', 'fakeToken')

        wrapper = mount(HomeComponent)
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.general-section').exists()).toBe(true)
        expect(wrapper.findComponent(AdminDashboardComponent).exists()).toBe(false)
        expect(wrapper.findComponent(ReceptionDashboardComponent).exists()).toBe(false)
        expect(wrapper.findComponent(CleaningDashboardComponent).exists()).toBe(false)
    })

    it('debería renderizar el ChatComponent correctamente', () => {
        expect(wrapper.findComponent(ChatComponent).exists()).toBe(true)
    })
})

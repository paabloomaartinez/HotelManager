import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LoginComponent from '../src/components/LoginComponent.vue'

describe('LoginComponent', () => {
    let wrapper

    beforeEach(() => {
        wrapper = mount(LoginComponent, {
            global: {
                provide: {
                    socket: { connect: vi.fn() } // 🔹 Simulamos el socket para evitar el error
                },
                mocks: {
                    $router: { push: vi.fn() }, // 🔹 Simulamos el router
                }
            }
        })
    })

    afterEach(() => {
        vi.restoreAllMocks() // Restauramos los mocks después de cada test
    })

    it('debería renderizar el formulario de login', () => {
        expect(wrapper.find('h2').text()).toBe('Iniciar Sesión')
        expect(wrapper.find('input#username').exists()).toBe(true)
        expect(wrapper.find('input#password').exists()).toBe(true)
        expect(wrapper.find('button').text()).toBe('Iniciar sesión')
    })

    it('debería actualizar el modelo cuando el usuario ingresa datos', async () => {
        const usernameInput = wrapper.find('input#username')
        const passwordInput = wrapper.find('input#password')

        await usernameInput.setValue('usuarioPrueba')
        await passwordInput.setValue('contraseñaPrueba')

        expect(wrapper.vm.login.nombreUsuario).toBe('usuarioPrueba')
        expect(wrapper.vm.login.contrasena).toBe('contraseñaPrueba')
    })

    it('debería mostrar un mensaje de error si los campos están vacíos', async () => {
        await wrapper.find('form').trigger('submit.prevent')
        expect(wrapper.vm.errorMessage).toBe('Por favor, completa todos los campos')
        expect(wrapper.find('.error').text()).toBe('Por favor, completa todos los campos')
    })

    it('debería deshabilitar el botón de login mientras se está autenticando', async () => {
        await wrapper.setData({ isLoading: true }) // Simula el estado de carga
        await wrapper.vm.$nextTick()
        expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })

    it('debería redirigir al usuario tras un login exitoso', async () => {
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ token: 'fakeToken', user: { name: 'User' } })
            })
        ))

        await wrapper.setData({
            login: { nombreUsuario: 'testuser', contrasena: 'password' }
        })

        await wrapper.find('form').trigger('submit.prevent')

        expect(sessionStorage.getItem('token')).toBe('fakeToken')
        expect(wrapper.vm.$router.push).toHaveBeenCalledWith('/home')
    })

    it('debería manejar errores de autenticación', async () => {
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'Credenciales incorrectas' })
            })
        ))

        await wrapper.setData({
            login: { nombreUsuario: 'testuser', contrasena: 'wrongpassword' }
        })

        await wrapper.find('form').trigger('submit.prevent')

        expect(wrapper.vm.errorMessage).toBe('Credenciales incorrectas')
        expect(wrapper.find('.error').text()).toBe('Credenciales incorrectas')
    })
})

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ErrorComponent from '../src/components/ErrorComponent.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createMemoryHistory } from 'vue-router'

// Simular Vue Router
const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div>Home</div>' } }]
})

describe('ErrorComponent', () => {
    it('debería renderizar correctamente el mensaje de error', () => {
        const wrapper = mount(ErrorComponent)

        expect(wrapper.find('h1').text()).toBe('404')
        expect(wrapper.find('p').text()).toBe('La página que buscas no existe.')
    })

    it('debería contener un enlace para volver al inicio', () => {
        const wrapper = mount(ErrorComponent, {
            global: {
                plugins: [router]
            }
        })

        const link = wrapper.find('a.back-home-link')

        expect(link.exists()).toBe(true)
        expect(link.text()).toBe('Volver al inicio')
        expect(link.attributes('href')).toBe('/')
    })
})

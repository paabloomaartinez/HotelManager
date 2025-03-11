import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatComponent from '../src/components/ChatComponent.vue';
import eventBus from '../src/eventBus';
import { nextTick } from 'vue';

describe('ChatComponent', () => {
    let wrapper;
    let mockSocket;

    beforeEach(() => {
        mockSocket = {
            on: vi.fn(),
            emit: vi.fn(),
            connected: true,
        };

        wrapper = mount(ChatComponent, {
            global: {
                provide: {
                    socket: {
                        getInstance: () => mockSocket,
                        connect: vi.fn(),
                    }
                },
                stubs: {
                    'router-link': { template: '<a><slot></slot></a>' }
                }
            }
        });
    });

    it('debería renderizar el botón del chat', () => {
        expect(wrapper.find('.chat-toggle').exists()).toBe(true);
    });

    it('debería abrir y cerrar el chat al hacer clic en el botón', async () => {
        const button = wrapper.find('.chat-toggle');
        await button.trigger('click');
        expect(wrapper.vm.isChatOpen).toBe(true);

        await button.trigger('click');
        expect(wrapper.vm.isChatOpen).toBe(false);
    });

    it('debería enviar un mensaje correctamente', async () => {
        wrapper.vm.selectedUser = { numeroDocumento: '1', nombre: 'Juan' };
        wrapper.vm.newMessage = 'Hola, Juan';

        await wrapper.vm.sendMessage();

        expect(mockSocket.emit).toHaveBeenCalledWith('privateMessage', {
            toUserId: '1',
            text: 'Hola, Juan'
        });
    });
});

import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReceptionDashboardComponent from '../src/components/Rol_Recep/ReceptionDashboardComponent.vue';

const mockRouter = {
    push: vi.fn(),
};

describe('ReceptionDashboardComponent', () => {
    let wrapper;

    beforeEach(() => {
        wrapper = mount(ReceptionDashboardComponent, {
            global: {
                mocks: {
                    $router: mockRouter, // Simulamos `$router`
                },
            },
        });
    });

    it('debería renderizar correctamente el componente', () => {
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.find('h2').text()).toBe('Panel de Recepcionista');
    });

    it('debería contener 4 tarjetas de funcionalidad', () => {
        const cards = wrapper.findAll('.card');
        expect(cards.length).toBe(4);
    });

    it('debería navegar a la página de reservas al hacer clic en "Gestionar Reservas"', async () => {
        const reservationsCard = wrapper.findAll('.card')[0]; // Primera tarjeta
        expect(reservationsCard.exists()).toBe(true);
        await reservationsCard.trigger('click');

        expect(mockRouter.push).toHaveBeenCalledWith('/reception/reservations');
    });

    it('debería navegar a la página de clientes al hacer clic en "Gestionar Clientes"', async () => {
        const clientsCard = wrapper.findAll('.card')[1]; // Segunda tarjeta
        expect(clientsCard.exists()).toBe(true);
        await clientsCard.trigger('click');

        expect(mockRouter.push).toHaveBeenCalledWith('/reception/clients');
    });

    it('debería navegar a la página de check-in/check-out al hacer clic en "Check-in / Check-out"', async () => {
        const checkInOutCard = wrapper.findAll('.card')[2]; // Tercera tarjeta
        expect(checkInOutCard.exists()).toBe(true); // 🔹 Asegura que el elemento existe
        await checkInOutCard.trigger('click');

        expect(mockRouter.push).toHaveBeenCalledWith('/reception/checkincheckout');
    });

    it('debería navegar a la página de gestión de habitaciones al hacer clic en "Gestionar Habitaciones"', async () => {
        const roomsCard = wrapper.findAll('.card')[3]; // Cuarta tarjeta
        expect(roomsCard.exists()).toBe(true); // 🔹 Asegura que el elemento existe
        await roomsCard.trigger('click');

        expect(mockRouter.push).toHaveBeenCalledWith('/rooms');
    });
});

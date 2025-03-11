import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHistory } from 'vue-router';
import socketPlugin from "./socketPlugin";
import { jwtDecode } from 'jwt-decode';
import LoginComponent from './components/LoginComponent.vue';
import HomeComponent from './components/HomeComponent.vue';
import EmployeeComponent from './components/Rol_Admin/Employee.vue';
import ProfileComponent from './components/ProfileComponent.vue';
import ErrorComponent from './components/ErrorComponent.vue';
import LoginReservaComponent from './components/Rol_Client/LoginReservaComponent.vue';
import RoomComponent from './components/RoomComponent.vue';
import ClientComponent from './components/Rol_Recep/ClientComponent.vue';
import RoomRack from './components/Rol_Recep/RoomRack.vue';
import ReservationForm from './components/Rol_Recep/ReservationForm.vue';
import ReservationDetails from './components/Rol_Recep/ReservationDetails.vue';
import ReservationDetailsComponent from './components/Rol_Client/ReservationDetailsComponent.vue';
import DailyCleaningComponent from './components/Rol_Mant/DailyCleaningComponent.vue';
import CheckInListComponent from './components/Rol_Recep/CheckInListComponent.vue';
import CheckInFormComponent from './components/Rol_Recep/CheckInFormComponent.vue';
import CheckOutListComponent from './components/Rol_Recep/CheckOutListComponent.vue';
import CheckInCheckOutDashboard from './components/Rol_Recep/CheckInCheckOutDashboard.vue';
import GuestDetails from './components/Rol_Recep/GuestDetails.vue';
import CreateClient from './components/Rol_Recep/CreateClient.vue';
import CompanyDetails from './components/Rol_Recep/CompanyDetails.vue';
import CheckOutFormComponent from './components/Rol_Recep/CheckOutFormComponent.vue';
import AdminReports from './components/Rol_Admin/AdminReports.vue';

const routes = [
    { path: '/', component: LoginComponent },
    {
        path: '/home',
        component: HomeComponent,
        meta: { requiresAuth: true }, // Esta ruta requiere autenticación
    },
    {
        path: '/profile',
        component: ProfileComponent,
        meta: { requiresAuth: true },
    },
    {
        path: '/reservations/:id',
        component: LoginReservaComponent,
    },
    {
        path: '/reservations/details/:id',
        component: ReservationDetailsComponent,
        meta: { requiresAuth: true },
    },
    {
        path: '/admin/employee',
        component: EmployeeComponent,
        meta: { requiresAuth: true, requiresRole: 'Administrador' },
    },
    {
        path: '/admin/reports',
        component: AdminReports,
        meta: { requiresAuth: true, requiresRole: 'Administrador' },
    },
    {
        path: '/reception/reservations',
        component: RoomRack,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/reception/newReservation',
        component: ReservationForm,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: "/reservation/details/:id",
        component: ReservationDetails,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/reception/clients',
        component: ClientComponent,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/reception/checkincheckout',
        component: CheckInCheckOutDashboard,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/guest/:numeroDocumento',
        component: GuestDetails,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/client/:NIF',
        component: CompanyDetails,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/reception/checkin',
        component: CheckInListComponent,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/reception/checkin/:id/room/:numHabitacion',
        component: CheckInFormComponent,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/reception/checkout',
        component: CheckOutListComponent,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/reception/checkout/:idReserva',
        component: CheckOutFormComponent,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/addClient',
        component: CreateClient,
        meta: { requiresAuth: true, requiresRole: 'Recepcionista' },
    },
    {
        path: '/rooms',
        component: RoomComponent,
        meta: { requiresAuth: true },
    },
    {
        path: '/cleaning/daily-cleaning',
        component: DailyCleaningComponent,
        meta: { requiresAuth: true, requiresRole: "LimpiezaYMantenimiento" },
    },
    {
        path: '/:pathMatch(.*)*',
        component: ErrorComponent,
    }
];

const router = createRouter({
    history: createWebHistory(), // Usamos el modo "history" sin hash
    routes,
});

const app = createApp(App);

router.beforeEach((to, from, next) => {
    const token = sessionStorage.getItem('token');

    // Evitar que un usuario autenticado acceda al login
    if (to.path === '/' && token) {
        try {
            const decodedToken = jwtDecode(token);
            const currentTime = Math.floor(Date.now() / 1000);
            if (decodedToken.exp > currentTime) {
                next('/home');
                return;
            }
        } catch (error) {
            console.error('Error al decodificar el token:', error);
        }
    }

    // Verificar autenticación
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!token) {
            next({ path: '/' });
        } else {
            try {
                const decodedToken = jwtDecode(token);
                const currentTime = Math.floor(Date.now() / 1000);

                // Verificar expiración del token
                if (decodedToken.exp < currentTime) {
                    sessionStorage.removeItem('token');
                    alert('Tu sesión ha expirado, por favor inicia sesión nuevamente.');
                    next({ path: '/' });
                }
                // Verificar permisos por rol
                else if (to.meta.requiresRole && !(to.meta.requiresRole === decodedToken.rol || decodedToken.rol === 'Administrador')) {
                    alert('No tienes permiso para acceder a esta sección.');
                    next('/home');
                } else {
                    next();
                }
            } catch (error) {
                console.error('Error al decodificar el token:', error);
                next({ path: '/' });
            }
        }
    } else {
        next();
    }
});


app.use(socketPlugin);
app.use(router);
app.mount('#app');

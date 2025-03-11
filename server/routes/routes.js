import express from 'express';
import Login from '../controllers/Login.js';
import Employees from '../controllers/Employees.js';
import Rooms from '../controllers/Rooms.js';
import Reservations from '../controllers/Reservations.js';
import Guests from '../controllers/Guests.js';
import Facturas from '../controllers/Facturas.js';
import Clients from '../controllers/Clients.js';
import Informes from '../controllers/Informes.js'
import dotenv from 'dotenv'

const router = express.Router();
dotenv.config({ path: '../.env' });

// Login Routes
router.post('/login', Login.login);
router.post("/reservations/getReservation", Login.getReservation);

// Employees Routes
router.get('/admin/employees/getEmployees', Employees.getEmployees);
router.post('/admin/employees/addEmployee', Employees.addEmployee);
router.put('/admin/employees/updateEmployee/', Employees.updateEmployee);
router.delete('/admin/employees/deleteEmployee/:numeroDocumento', Employees.deleteEmployee);
router.post('/employees/changePassword', Employees.changePassword);
router.post('/admin/changeRole', Employees.changeRole);

// Rooms Routes
router.get('/rooms/getRooms', Rooms.getRooms);
router.put('/rooms/setRoomState/', Rooms.setRoomState);
router.get('/rooms/getDirtyRooms', Rooms.getDirtyRooms);
router.post("/rooms/markAsClean", Rooms.markAsClean);
router.post("/rooms/omitCleaning", Rooms.omitCleaning);
router.get("/rooms/getRoomDetails/:idReserva/:numHabitacion", Rooms.getRoomDetails);


// Reservations Routes
router.get("/reservations/getAllReservations", Reservations.getAllReservations);
router.post("/reservations/available", Reservations.getAvailableRoomsOnRange);
router.post("/reservations/makeReservation", Reservations.createReservation);
router.get("/reservations/getReservationDetails/:id", Reservations.getReservationDetails);
router.post("/reservations/updateReservationDays", Reservations.updateReservationDays);
router.post("/reservations/updateReservationServices", Reservations.updateReservationServices);
router.post("/reservations/updateReservationRooms", Reservations.updateReservationRooms);
router.post("/reservations/updateReservationPersons", Reservations.updateReservationPersons);
router.post("/reservations/cancelReservation", Reservations.cancelReservation);
router.get("/reservations/todayCheckIns", Reservations.todayCheckIns);
router.get("/reservations/todayCheckOuts", Reservations.todayCheckOuts);
router.get('/clients/guests/:idReserva', Reservations.getGuestFromReservation);
router.post("/reservations/processCheckOut", Reservations.processCheckOut);
router.get("/checkins/summary", Reservations.checkinsSummary);
router.get("/checkouts/summary", Reservations.checkoutsSummary);


//Guests Routes
router.post("/reservations/registerGuestsForRoom", Guests.registerGuestsForRoom);

//Facturas Routes
router.get("/factura/:idReserva", Facturas.getFactura)

//Clients Routes
router.get("/clients/guests", Clients.getGuests);
router.get("/clients/corporate", Clients.getCorporateClients);
router.get("/guests/details/:numeroDocumento", Clients.getGuestDetails);
router.get("/reservations/history/:numeroDocumento", Clients.getGuestReservations);
router.get("/corporate/details/:NIF", Clients.getCorporateDetails);
router.post("/clients/addGuest", Clients.addParticular);
router.post("/clients/addCorporate", Clients.addCorporate);
router.put('/clients/updateParticular', Clients.updateParticular);
router.put('/clients/updateCompany', Clients.updateCompany);


//Chat
router.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los mensajes' });
    }
});

// Obtener token API Paypal
router.get('/config/paypal', async (req, res) => {
    res.json({ clientId: process.env.PAYPAL_CLIENT_ID });
});

// Informes
router.get("/lista-policia", Informes.getListaPolicia);
router.get("/lista-ocupacion", Informes.getListaOcupacion);
router.get("/checkins-hoy", Informes.getCheckIns);
router.get("/checkouts-hoy", Informes.getCheckOuts);
router.get("/reservas", Informes.getInformeReservas);

export default router;

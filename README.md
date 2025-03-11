# 📌 Sistema de Gestión Hotelera - TFG

## 📖 Descripción

Este proyecto es un **Sistema de Gestión Hotelera** desarrollado como parte del **Trabajo de Fin de Grado (TFG)** en **Ingeniería Informática, especialidad en Ingeniería del Software**. Su objetivo principal es proporcionar una plataforma eficiente y fácil de usar para gestionar la operación diaria de un hotel, incluyendo **reservas, facturación, administración de empleados, habitaciones, huéspedes y generación de informes**.

[![Demo Video](https://img.youtube.com/vi/le19BptaIMQ/maxresdefault.jpg)](https://youtu.be/le19BptaIMQ)

---

## 🚀 Funcionalidades

El sistema permite realizar las siguientes acciones:

- **Gestión de Reservas**: Crear, modificar y cancelar reservas de habitaciones.
- **Administración de Empleados**: Añadir, modificar y eliminar empleados, así como gestionar sus roles y credenciales.
- **Manejo de Habitaciones**: Consultar habitaciones disponibles, actualizar su estado (limpia, ocupada, sucia, bloqueada, etc.) y ver detalles específicos.
- **Control de Huéspedes**: Registrar huéspedes, obtener información sobre clientes corporativos y particulares.
- **Generación de Facturas**: Obtener facturas de las reservas realizadas.
- **Generación de Informes**: Crear informes de ocupación, check-ins, check-outs y registros de huéspedes para la policía.
- **Integración con PayPal**: Configuración de pagos mediante PayPal.
- **Chat Interno**: Comunicación entre empleados.

---

## 🛠️ **Tecnologías Utilizadas**

- **Backend**: Node.js con Express.js.
- **Base de Datos**: MySQL y MongoDB.
- **Autenticación**: JSON Web Tokens (JWT).
- **Pruebas**: Vitest y Supertest.
- **Frontend**: Vue.js.
- **Servicios de Pago**: PayPal API.
- **Mensajería en Tiempo Real**: WebSockets con Socket.io.

---

## 📌 Cómo Ejecutar el Proyecto

### **Clonar el repositorio**

```sh
 git clone https://github.com/paabloomaartinez/HotelManager.git
```

### **Configurar la Base de datos**

Este sistema utiliza MySQL Workbench. La estructura de la base de datos es la siguiente:

```sql
CREATE DATABASE IF NOT EXISTS HotelManagement;
USE HotelManagement;

-- Tabla: Persona
CREATE TABLE Persona (
    numeroDocumento VARCHAR(20) PRIMARY KEY,
    tipoDocumento VARCHAR(20) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellidos VARCHAR(50) NOT NULL
);

-- Tabla: Empleado
CREATE TABLE Empleado (
    numeroDocumento VARCHAR(20),
    nombreUsuario VARCHAR(50) NOT NULL,
    contrasena VARCHAR(100) NOT NULL,
    rol ENUM('Administrador', 'Recepcionista', 'Limpiza/Mantenimiento') NOT NULL,
    PRIMARY KEY (numeroDocumento),
    FOREIGN KEY (numeroDocumento) REFERENCES Persona(numeroDocumento)
);

-- Tabla: Cliente
CREATE TABLE Cliente (
    idCliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellidos VARCHAR(50) NOT NULL,
    correo VARCHAR(100),
    telefono VARCHAR(15)
);

-- Tabla: Empresa/Agencia
CREATE TABLE EmpresaAgencia (
    NIF VARCHAR(20) PRIMARY KEY,
    razonSocial VARCHAR(100),
    nombreComercial VARCHAR(100),
    direccionFiscal VARCHAR(150),
    codigoPostal VARCHAR(10)
);

-- Tabla: Habitacion
CREATE TABLE Habitacion (
    numHabitacion INT PRIMARY KEY,
    numCamas INT NOT NULL,
    opcionSupletoria BOOLEAN DEFAULT 0,
    tipo ENUM('Individual', 'Doble estandar', 'Doble superior', 'Suite') NOT NULL,
    estado ENUM('Limpia', 'Sucia', 'Disponible', 'Ocupada', 'Fuera de Servicio', 'Bloqueada') NOT NULL
);


-- Tabla: Tarifa
CREATE TABLE Tarifa (
    idTarifa INT AUTO_INCREMENT PRIMARY KEY,
    nombreTarifa VARCHAR(100) NOT NULL,
    descripcionTarifa TEXT,
    precio DECIMAL(10, 2) NOT NULL
);

-- Tabla: Aplica (relación entre Habitacion y Tarifa)
CREATE TABLE Aplica (
    numHabitacion INT,
    idTarifa INT,
    PRIMARY KEY (numHabitacion, idTarifa),
    FOREIGN KEY (numHabitacion) REFERENCES Habitacion(numHabitacion),
    FOREIGN KEY (idTarifa) REFERENCES Tarifa(idTarifa)
);

-- Tabla: Reserva
CREATE TABLE Reserva (
    idReserva INT AUTO_INCREMENT PRIMARY KEY,
    fechaEntrada DATE NOT NULL,
    fechaSalida DATE NOT NULL,
    numPersonas INT NOT NULL,
    precio DECIMAL(10, 2),
    estado VARCHAR(50),
    notas TEXT,
    idCliente INT,
    FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente)
);

-- Tabla: HabitacionReservada (relación entre Reserva y Habitacion)
CREATE TABLE HabitacionReservada (
    idReserva INT,
    numHabitacion INT,
    fechaEntrada DATE,
    fechaSalida DATE,
    opcionSupletoria BOOLEAN,
    PRIMARY KEY (idReserva, numHabitacion),
    FOREIGN KEY (idReserva) REFERENCES Reserva(idReserva),
    FOREIGN KEY (numHabitacion) REFERENCES Habitacion(numHabitacion)
);

-- Tabla: Temporada
CREATE TABLE Temporada (
    idTemporada INT AUTO_INCREMENT PRIMARY KEY,
    nombreTemporada VARCHAR(100) NOT NULL,
    fechaInicio DATE NOT NULL,
    fechaFin DATE NOT NULL
);

-- Relación: Tarifa y Temporada
CREATE TABLE Asocia (
    idTarifa INT,
    idTemporada INT,
    PRIMARY KEY (idTarifa, idTemporada),
    FOREIGN KEY (idTarifa) REFERENCES Tarifa(idTarifa),
    FOREIGN KEY (idTemporada) REFERENCES Temporada(idTemporada)
);

-- Tabla: Servicio
CREATE TABLE Servicio (
    idServicio INT AUTO_INCREMENT PRIMARY KEY,
    nombreServicio VARCHAR(100) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL
);

-- Relación: Reserva y Servicio
CREATE TABLE Anade (
    idReserva INT,
    idServicio INT,
    PRIMARY KEY (idReserva, idServicio),
    FOREIGN KEY (idReserva) REFERENCES Reserva(idReserva),
    FOREIGN KEY (idServicio) REFERENCES Servicio(idServicio)
);

-- Tabla: Huesped
CREATE TABLE Huesped (
    numeroDocumento VARCHAR(20),
    fechaNacimiento DATE,
    fechaCaducidad DATE,
    fechaEmision DATE,
    nacionalidad VARCHAR(50),
    direccion VARCHAR(150),
    hijoDe VARCHAR(50),
    lugarNacimiento VARCHAR(100),
    sexo VARCHAR(10),
    PRIMARY KEY (numeroDocumento),
    FOREIGN KEY (numeroDocumento) REFERENCES Persona(numeroDocumento)
);

CREATE TABLE HuespedHabitacion (
    numeroDocumento VARCHAR(20),
    idReserva INT,
    numHabitacion INT,
    PRIMARY KEY (numeroDocumento, idReserva, numHabitacion),
    FOREIGN KEY (numeroDocumento) REFERENCES Huesped(numeroDocumento),
    FOREIGN KEY (idReserva) REFERENCES Reserva(idReserva),
    FOREIGN KEY (numHabitacion) REFERENCES Habitacion(numHabitacion)
);

CREATE TABLE Facturas (
    idFactura INT AUTO_INCREMENT PRIMARY KEY,
    idReserva INT NOT NULL,
    archivoPDF LONGBLOB NOT NULL,
    fechaGeneracion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idReserva) REFERENCES Reserva(idReserva)
);

INSERT INTO Temporada (nombreTemporada, fechaInicio, fechaFin) VALUES
('Temporada Alta', '2025-06-01', '2025-08-31'),
('Temporada Baja', '2025-09-01', '2025-02-28'),
('Temporada Media', '2025-03-01', '2025-05-31');

INSERT INTO Tarifa (nombreTarifa, descripcionTarifa, precio) VALUES
('Tarifa Standard', 'Tarifa estándar para habitaciones regulares', 100.00),
('Tarifa Premium', 'Tarifa para habitaciones premium o suites', 200.00),
('Tarifa Económica', 'Tarifa reducida para temporadas bajas', 80.00);

INSERT INTO Asocia (idTarifa, idTemporada) VALUES
(1, 1), -- Tarifa Standard con Temporada Alta
(2, 1), -- Tarifa Premium con Temporada Alta
(3, 2), -- Tarifa Económica con Temporada Baja
(1, 3), -- Tarifa Standard con Temporada Media
(2, 3); -- Tarifa Premium con Temporada Media

INSERT INTO Aplica (numHabitacion, idTarifa)
SELECT numHabitacion, 3
FROM Habitacion
WHERE tipo = 'Individual';

-- Asociar tarifa estándar a habitaciones dobles estándar
INSERT INTO Aplica (numHabitacion, idTarifa)
SELECT numHabitacion, 1
FROM Habitacion
WHERE tipo = 'Doble estandar';

-- Asociar tarifa premium a habitaciones dobles superiores
INSERT INTO Aplica (numHabitacion, idTarifa)
SELECT numHabitacion, 2
FROM Habitacion
WHERE tipo = 'Doble superior';

-- Asociar tarifa premium a habitaciones tipo suite
INSERT INTO Aplica (numHabitacion, idTarifa)
SELECT numHabitacion, 2
FROM Habitacion
WHERE tipo = 'Suite';

INSERT INTO Persona (numeroDocumento, tipoDocumento, nombre, apellidos)
VALUES ('00000000P', 'DNI', 'Pablo', 'Martinez Amunarruz');

INSERT INTO Empleado (numeroDocumento, nombreUsuario, contrasena, rol)
VALUES ('00000000P', 'pmartinez', '$argon2id$v=19$m=65536,t=3,p=4$lNFBIAfg84uWRxz5j/yCqg$KOUTRaDoHZpab3Noca4gnP34xPlY5iFojf2hxTVtIX0', 'Administrador');
```

### **Configurar variables de entorno (.env)**

Crear un archivo `.env` en la raíz con:

```
DB_HOST = tu_host
DB_USER = tu_user
DB_PASSWORD = tu_password
DB_NAME = HotelManagement

PORT = 3000

SECRET_KEY = secret_key #Encriptacion argon2

RESEND_API_KEY= tu_resend_api

FRONTEND_BASE_URL= http://localhost:8080

PAYPAL_CLIENT_ID= tu_paypal_id

MONGO_URI= tu_mongo_uri
```

### **Ejecutar el frontend**

```sh
 cd client
 npm install
```

- Ejecutar en modo desarrollo: `npm run serve`
- Ejecutar en modo de despliegue (optimizado): `npm run build`

El cliente se ejecutará en http://localhost:8080.

En el **Login** podrás usar:

- Usuario: `pmartinez`
- Contraseña: `pmartinez`

### **Ejecutar el backend**

```sh
 cd server
 npm install
 npm start
```

El servidor se ejecutará en el puerto que se haya configurado en el fichero `.env` o por defecto en http://localhost:3000

---

## 📌 Rutas Disponibles

### 🔑 **Autenticación y Login**

- `POST /login` → Iniciar sesión.
- `POST /reservations/getReservation` → Obtener detalles de una reserva.

### 👥 **Gestión de Empleados**

- `GET /admin/employees/getEmployees` → Obtener la lista de empleados.
- `POST /admin/employees/addEmployee` → Agregar un nuevo empleado.
- `PUT /admin/employees/updateEmployee/` → Actualizar datos de un empleado.
- `DELETE /admin/employees/deleteEmployee/:numeroDocumento` → Eliminar un empleado.
- `POST /employees/changePassword` → Cambiar la contraseña de un empleado.
- `POST /admin/changeRole` → Cambiar el rol de un empleado.

### 🏨 **Gestión de Habitaciones**

- `GET /rooms/getRooms` → Obtener la lista de habitaciones.
- `PUT /rooms/setRoomState/` → Actualizar el estado de una habitación.
- `GET /rooms/getDirtyRooms` → Obtener las habitaciones sucias.
- `POST /rooms/markAsClean` → Marcar una habitación como limpia.
- `POST /rooms/omitCleaning` → Omitir la limpieza de una habitación.
- `GET /rooms/getRoomDetails/:idReserva/:numHabitacion` → Obtener detalles de una habitación específica.

### 📅 **Gestión de Reservas**

- `GET /reservations/getAllReservations` → Obtener todas las reservas.
- `POST /reservations/available` → Consultar disponibilidad de habitaciones en un rango de fechas.
- `POST /reservations/makeReservation` → Crear una nueva reserva.
- `GET /reservations/getReservationDetails/:id` → Obtener detalles de una reserva.
- `POST /reservations/updateReservationDays` → Modificar las fechas de una reserva.
- `POST /reservations/updateReservationServices` → Actualizar servicios de una reserva.
- `POST /reservations/updateReservationRooms` → Modificar habitaciones de una reserva.
- `POST /reservations/updateReservationPersons` → Modificar el número de personas de una reserva.
- `POST /reservations/cancelReservation` → Cancelar una reserva.
- `GET /reservations/todayCheckIns` → Obtener los check-ins del día.
- `GET /reservations/todayCheckOuts` → Obtener los check-outs del día.
- `GET /clients/guests/:idReserva` → Obtener los huéspedes de una reserva.
- `POST /reservations/processCheckOut` → Procesar check-out de una reserva.
- `GET /checkins/summary` → Obtener resumen de check-ins.
- `GET /checkouts/summary` → Obtener resumen de check-outs.

### 🛏️ **Gestión de Huéspedes**

- `POST /reservations/registerGuestsForRoom` → Registrar huéspedes en una habitación.
- `GET /clients/guests` → Obtener lista de huéspedes particulares.
- `GET /clients/corporate` → Obtener lista de clientes corporativos.
- `GET /guests/details/:numeroDocumento` → Obtener detalles de un huésped.
- `GET /reservations/history/:numeroDocumento` → Obtener historial de reservas de un huésped.
- `GET /corporate/details/:NIF` → Obtener detalles de una empresa/agencia.
- `POST /clients/addGuest` → Agregar un huésped particular.
- `POST /clients/addCorporate` → Agregar un cliente corporativo.
- `PUT /clients/updateParticular` → Actualizar datos de un huésped particular.
- `PUT /clients/updateCompany` → Actualizar datos de una empresa/agencia.

### 🧾 **Facturación**

- `GET /factura/:idReserva` → Obtener la factura de una reserva.

### 📝 **Informes y Reportes**

- `GET /lista-policia` → Obtener lista de huéspedes para la policía.
- `GET /lista-ocupacion` → Obtener informe de ocupación del hotel.
- `GET /checkins-hoy` → Obtener lista de check-ins del día.
- `GET /checkouts-hoy` → Obtener lista de check-outs del día.
- `GET /reservas` → Obtener informe de reservas finalizadas.

### 💬 **Chat Interno**

- `GET /messages` → Obtener mensajes del chat.

### 💳 **Pagos y Configuración**

- `GET /config/paypal` → Obtener configuración de PayPal.

---

## 🛠️ Cómo Ejecutar las pruebas

### **Ejecutar pruebas en el frontend**

```sh
 cd client
 npm install
 npm run test
```

### **Ejecutar pruebas en el backend**

```sh
 cd server
 npm install
 npm test
```

El proyecto incluye un workflow test.yml en GitHub Actions. Cada vez que se realiza un push o pull request al repositorio, se ejecutan automáticamente las pruebas del backend y frontend.

Esto garantiza la estabilidad y calidad del código de forma continua.

---

## 👨‍💻 **Autor**

Este proyecto ha sido desarrollado como parte del **Trabajo de Fin de Grado** en **Ingeniería Informática - Ingeniería del Software**.

Si tienes preguntas o sugerencias, ¡no dudes en contribuir o contactarme! 😊

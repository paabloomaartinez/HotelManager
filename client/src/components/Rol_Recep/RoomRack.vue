<template>
  <HeaderComponent />
  <div class="room-rack">
    <!-- Navegación de Fechas -->
    <div class="navigation">
      <button class="nav-button primary" @click="navigateToNewReservation">+ Nueva Reserva</button>
      <button class="nav-button prev-week-button" @click="moveWeek(-1)">← Semana Anterior</button>
      <div class="view-options">
        <label>
          <input type="radio" value="7" v-model="dayView" @change="updateDayView" />
          7 días
        </label>
        <label>
          <input type="radio" value="15" v-model="dayView" @change="updateDayView" />
          15 días
        </label>
        <label>
          <input type="radio" value="30" v-model="dayView" @change="updateDayView" />
          1 mes
        </label>
      </div>
      <button class="nav-button next-week-button" @click="moveWeek(1)">Semana Siguiente →</button>
    </div>

    <div class="rack-header" >
      <div class="empty-header">Habitaciones
      </div>
      <div class="empty-header-estado">Estado
      </div>
      <div v-for="(day, index) in days" :key="index" class="day-header">
        {{ formatDate(day) }}
      </div>
    </div>

    <div class="rack-body">
      <div v-for="room in rooms" :key="room.Numero" class="room-row">
        <div class="room-name" >
          {{ room.Numero }} ({{ room.Tipo }})
        </div>
        <div class="room-status" :class="getStatusClass(room.Estado)">
          {{ room.Estado }}
        </div>
        <div
          v-for="day in days"
          :key="day"
          class="day-cell"
          :class="[getReservationStateClass(room, day), { 'hovered': isReservationHovered(room, day) }]"
          :style="getCellStyle()"
          @mouseover="handleMouseOver(room, day)"
          @mouseout="handleMouseOut()"
          @click="handleCellClick(room, day)"
        >
          <span v-if="isReservationStart(room, day)">
            {{ getReservationDetails(room, day) }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import HeaderComponent from '../Header/HeaderComponent.vue';
import { inject, onMounted, onUnmounted, ref } from "vue";

export default {
  name: "RoomRack",
  components: {
    HeaderComponent,
  },
  setup() {
    const socket = inject("socket").getInstance();
    
    const rooms = ref([]); // Estado reactivo para habitaciones
    const reservations = ref([]); // Estado reactivo para reservas

    // Función para obtener habitaciones desde el backend
    const fetchRooms = async () => {
      try {
        const response = await fetch("http://localhost:3000/rooms/getRooms");
        if (!response.ok) throw new Error("Error al obtener las habitaciones");
        rooms.value = await response.json();
      } catch (error) {
        console.error("Error al obtener las habitaciones:", error);
      }
    };

    // Función para obtener reservas desde el backend
    const fetchReservations = async () => {
      try {
        const response = await fetch("http://localhost:3000/reservations/getAllReservations");
        if (!response.ok) throw new Error("Error al obtener las reservas");
        reservations.value = await response.json();
      } catch (error) {
        console.error("Error al obtener las reservas:", error);
      }
    };

    // Función para recargar datos cuando se emita el evento de sockets
    const fetchData = async () => {
      await fetchRooms();
      await fetchReservations();
    };

    // Conectar los sockets
    onMounted(() => {
      socket.on("actualizarReservas", fetchData);
      socket.on("actualizarHabitaciones", fetchData);
      fetchData(); // Obtener datos al cargar el componente
    });

    onUnmounted(() => {
      socket.off("actualizarReservas", fetchData);
      socket.off("actualizarHabitaciones", fetchData);
    });

    return { rooms, reservations, fetchRooms, fetchReservations };
  },
  data() {
    return {
      days: [], // Días visibles en el rack
      today: new Date(), // Fecha base para la semana actual
      dayView: "7", // Número de días a mostrar (7, 15, o 30)
      hoveredReservationId: null,
    };
  },
  created() {
    this.updateDayView(); // Inicializa los días según la vista por defecto
    this.fetchRooms();
    this.fetchReservations();
  },
  methods: {
    getReservationStateClass(room, day) {
      const reservation = this.reservations.find(
        (res) =>
          res.numHabitacion === room.Numero &&
          new Date(res.fechaEntrada) <= day &&
          new Date(res.fechaSalida) >= day
      );
      if (reservation) {
        switch (reservation.estado) {
          case "Activa":
            return "reservation-active";
          case "En_curso":
            return "reservation-in-progress";
          case "Finalizada":
            return "reservation-completed";
          default:
            return "";
        }
      }
      return ""; // No clase si no hay reserva
    },
    // Actualiza el rango de días basado en la selección
    updateDayView() {
      const length = parseInt(this.dayView, 10);
      this.days = Array.from({ length }, (_, i) => {
        const date = new Date(this.today);
        date.setDate(this.today.getDate() + i);
        return date;
      });
    },

    moveWeek(offset) {
      this.today.setDate(this.today.getDate() + offset * 7);
      this.updateDayView();
    },

    formatDate(date) {
      const options = { weekday: "short", day: "numeric", month: "short" };
      return date.toLocaleDateString("es-ES", options);
    },

    hasReservation(room, day) {
      return this.reservations.some(
        (res) =>
          res.numHabitacion === room.Numero &&
          new Date(res.fechaEntrada) <= day &&
          new Date(res.fechaSalida) >= day
      );
    },

    isReservationStart(room, day) {
      return this.reservations.some(
        (res) =>
          res.numHabitacion === room.Numero &&
          new Date(res.fechaEntrada).toDateString() === day.toDateString()
      );
    },

    isReservationHovered(room, day) {
      return this.reservations.some(
        (res) =>
          res.idReserva === this.hoveredReservationId &&
          res.numHabitacion === room.Numero &&
          new Date(res.fechaEntrada) <= day &&
          new Date(res.fechaSalida) >= day
      );
    },

    handleMouseOver(room, day) {
      const reservation = this.reservations.find(
        (res) =>
          res.numHabitacion === room.Numero &&
          new Date(res.fechaEntrada) <= day &&
          new Date(res.fechaSalida) >= day
      );
      if (reservation) {
        this.hoveredReservationId = reservation.idReserva;
      }
    },

    handleMouseOut() {
      this.hoveredReservationId = null;
    },

    handleCellClick(room, day) {
      const reservation = this.reservations.find(
        (res) =>
          res.numHabitacion === room.Numero &&
          new Date(res.fechaEntrada) <= day &&
          new Date(res.fechaSalida) >= day
      );
      if (reservation) {
        this.$router.push(`/reservation/details/${reservation.idReserva}`);
      }
    },

    getReservationDetails(room, day) {
      const reservation = this.reservations.find(
        (res) =>
          res.numHabitacion === room.Numero &&
          new Date(res.fechaEntrada).toDateString() === day.toDateString()
      );
      return reservation ? `${reservation.clienteNombre}` : null;
    },

    getStatusClass(estado) {
      const statusClasses = {
        Limpia: "status-clean",
        Sucia: "status-dirty",
        Disponible: "status-available",
        Ocupada: "status-occupied",
        "Fuera de Servicio": "status-outofservice",
        Bloqueada: "status-blocked",
      };
      return statusClasses[estado] || "status-unknown";
    },

    getCellStyle() {
      let fontSize = "100%";
      if (this.dayView === "15") {
        fontSize = "80%";
      } else if (this.dayView === "30") {
        fontSize = "60%";
      }
      return { fontSize };
    },
    // getColumnWidth() {
    //   let roomWidth = 160; // Ancho por defecto
    //   let statusWidth = 150;
    //   if (this.dayView === "30") {
    //     roomWidth = 77;
    //     statusWidth = 51;
    //   }

    //   return { roomWidth: `${roomWidth}px`, statusWidth: `${statusWidth}px` };
    // },
    // shouldIHide() {
    //   return this.dayView === "30";
    // },

    navigateToNewReservation() {
      this.$router.push("/reception/newReservation");
    },
  },
};
</script>

<style scoped>
.room-rack {
  margin: 10px 10px 0 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rack-header {
  display: flex;
  background-color: #ffffff;
  border-bottom: 2px solid #dddddd;
  position: sticky; /* Hace que el encabezado permanezca fijo */
  top: 0; /* Se fija en la parte superior del contenedor */
  z-index: 10; /* Asegura que el encabezado esté por encima del contenido */
  max-width: 99.1%;
}

.rack-body {
  display: flex;
  flex-direction: column;
  overflow-y: auto; /*Agrega un desplazamiento vertical*/
  max-height: calc(100vh - 150px); /* Ajusta la altura máxima del cuerpo según el viewport */
}

.day-header {
  flex: 1;
  text-align: center;
  padding: 10px;
  background-color: #f1f1f1;
  border-right: 1px solid #dddddd;
  font-size: 14px;
}

.empty-header {
  width: 180px; /* Ajusta el ancho del encabezado */
  border-right: 1px solid #dddddd;
  text-align: center;
  margin-top: 10px;
  background-color: #ffffff; /* Asegura que tenga un fondo fijo */
}

.empty-header-estado {
  width: 150px; /* Ajusta el ancho del encabezado */
  border-right: 1px solid #dddddd;
  text-align: center;
  margin-top: 10px;
  background-color: #ffffff; /* Asegura que tenga un fondo fijo */
}


.room-row {
  display: flex;
}

.room-name {
  width: 160px;
  padding: 10px;
  text-align: left;
  background-color: #e9ecef;
  border-right: 1px solid #dddddd;
  font-weight: bold;
}

.room-status {
  width: 150px;
  text-align: center;
  font-weight: bold;
  border-right: 1px solid #dddddd;
  justify-content: center;
  align-items: center;
  display: flex;
}

.day-cell:hover {
  background-color: #e2e6ea;
}

.navigation {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  gap: 20px;
  align-items: center;
}

.nav-button {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  border-radius: 5px;
}

.nav-button:hover {
  background-color: #0056b3;
}

.nav-button.primary {
  background-color: #28a745;
  color: white;
}

.nav-button.primary:hover {
  background-color: #218838;
}

/* Colores para los estados */
.status-clean {
  background-color: #28a745; /* Verde intenso */
  color: #ffffff;
}

.status-dirty {
  background-color: #e74c3c; /* Rojo vibrante */
  color: #ffffff;
}

.status-available {
  background-color: #6fb3f2; /* Azul claro */
  color: #ffffff;
}

.status-occupied {
  background-color: #f4c542; /* Amarillo claro */
  color: #ffffff;
}

.status-outofservice {
  background-color: #adb5bd; /* Gris */
  color: #ffffff;
}

.status-blocked {
  background-color: #8b0000; /* Rojo oscuro intenso */
  color: #ffffff;
}

.status-unknown {
  background-color: #e1e1e1;
  color: #000;
}

/* Colores según el estado de las reservas */
.reservation-active {
  background-color: #d4edda; /* Verde claro */
  color: #155724;
}

.reservation-in-progress {
  background-color: #fff3cd; /* Amarillo claro */
  color: #856404;
}

.reservation-completed {
  background-color: #cce5ff; /* Azul claro */
  color: #004085;
}

/* Otros estilos existentes */
.day-cell {
  flex: 1;
  height: 50px;
  border-right: 1px solid #dddddd;
  border-bottom: 1px solid #dddddd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.day-cell.reserved {
  font-weight: bold;
}

.day-cell.hovered {
  background-color: #ffebcc; /* Color para las celdas destacadas */
  font-weight: bold;
  color: #856404;
}


</style>

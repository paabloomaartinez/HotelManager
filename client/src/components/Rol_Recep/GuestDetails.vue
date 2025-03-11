<template>
  <HeaderComponent />
  <div class="guest-details-container">
    <h1>Detalles del Huésped</h1>

    <!-- Información del huésped -->
    <div class="guest-info">
      <h2>Información del Huésped</h2>
      <p><strong>Número de Documento:</strong> {{ guest.numeroDocumento }}</p>
      <p><strong>Tipo de Documento:</strong> {{ guest.tipoDocumento }}</p>
      <p><strong>Nombre:</strong> {{ guest.nombre }}</p>
      <p><strong>Apellidos:</strong> {{ guest.apellidos }}</p>
      <p><strong>Nacionalidad:</strong> {{ guest.nacionalidad }}</p>
      <p><strong>Dirección:</strong> {{ guest.direccion }}</p>
      <p><strong>Sexo:</strong> {{ guest.sexo }}</p>
      <p><strong>Lugar de Nacimiento:</strong> {{ guest.lugarNacimiento }}</p>
      <p><strong>Hijo de:</strong> {{ guest.hijoDe || "N/A" }}</p>
    </div>

    <!-- Historial de reservas -->
    <div v-if="reservations.length" class="reservations">
      <h2>Historial de Reservas</h2>
      <table>
        <thead>
          <tr>
            <th>ID Reserva</th>
            <th>Fecha de Entrada</th>
            <th>Fecha de Salida</th>
            <th>Habitación</th>
            <th>Factura</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="reservation in reservations" :key="reservation.idReserva">
            <td>{{ reservation.idReserva }}</td>
            <td>{{ reservation.fechaEntrada }}</td>
            <td>{{ reservation.fechaSalida }}</td>
            <td>{{ reservation.numHabitacion }}</td>
            <td>
              <a
                :href="`http://localhost:3000/factura/${reservation.idReserva}`"
                target="_blank"
                class="btn-open"
              >
                Ver Factura
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sin historial -->
    <div v-else>
      <h3>No hay historial de reservas para este huésped.</h3>
    </div>

    <!-- Botón Volver Atrás -->
    <div class="button-container">
      <button @click="goBack" class="btn-back">Volver Atrás</button>
    </div>
  </div>
</template>

<script>
import { inject, onMounted, onUnmounted, ref } from "vue";
import HeaderComponent from '../Header/HeaderComponent.vue';
import { useRoute } from 'vue-router';

export default {
  name: "GuestDetails",
  components: { HeaderComponent },

  setup() {
    const socket = inject("socket").getInstance(); // Obtener instancia del socket
    const guest = ref({}); // Información del huésped
    const reservations = ref([]); // Historial de reservas
    const route = useRoute();

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };

    const fetchGuestDetails = async () => {
      const guestId = route.params.numeroDocumento;
      try {
        const response = await fetch(
          `http://localhost:3000/guests/details/${guestId}`
        );
        guest.value = await response.json();
      } catch (error) {
        console.error("Error al obtener los detalles del huésped:", error);
      }
    };

    const fetchReservations = async () => {
      const guestId = route.params.numeroDocumento;
      try {
        const response = await fetch(
          `http://localhost:3000/reservations/history/${guestId}`
        );
        const data = await response.json();

        reservations.value = data.map((reservation) => ({
          ...reservation,
          fechaEntrada: formatDate(reservation.fechaEntrada),
          fechaSalida: formatDate(reservation.fechaSalida),
        }));
      } catch (error) {
        console.error("Error al obtener el historial de reservas:", error);
      }
    };

    onMounted(() => {
      fetchGuestDetails();
      fetchReservations();

      socket.on("actualizarHuespedes", () => {
        console.log("📢 Actualizando detalles del huésped...");
        fetchGuestDetails();
        fetchReservations();
      });
    });

    onUnmounted(() => {
      socket.off("actualizarHuespedes");
    });

    return { guest, reservations, fetchGuestDetails, fetchReservations, formatDate };
  },
  created() {
    this.fetchGuestDetails();
    this.fetchReservations();
  },
  methods: {
    goBack() {
      this.$router.go(-1); // Vuelve a la página anterior
    },
  },
};
</script>

<style scoped>
.guest-details-container {
  background-color: #f5f5f5;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.guest-info {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
}
.reservations {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #333;
  margin-bottom: 10px;
  border-bottom: 2px solid #3498db;
  padding-bottom: 5px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th,
td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

tr:hover {
  background-color: #f1f1f1;
}

.btn-open {
  display: inline-block;
  margin: 5px 10px 0 0;
  padding: 8px 12px;
  background-color: #3498db;
  color: #fff;
  text-decoration: none;
  border-radius: 5px;
  font-size: 14px;
  text-align: center;
  transition: background-color 0.3s ease;
}

.btn-open:hover {
  background-color: #1d6fa5;
}

/* Estilos para el botón Volver Atrás */
.button-container {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.btn-back {
  color: #fff;
  padding: 12px 20px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s ease-in-out;
  background-color: #6c757d;
}

.btn-back:hover {
  background-color: #5a6268;
}
</style>

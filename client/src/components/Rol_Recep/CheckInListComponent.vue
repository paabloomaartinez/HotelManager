<template>
    <HeaderComponent />
    <div class="checkin-list">
      <h2>Check-ins de Hoy</h2>
      <table v-if="reservations.length">
        <thead>
          <tr>
            <th>Reserva ID</th>
            <th>Cliente</th>
            <th>Fecha de Entrada</th>
            <th>Fecha de Salida</th>
            <th>Habitación</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in reservations" :key="room.numHabitacion">
            <td>{{ room.idReserva }}</td>
            <td>{{ room.clienteNombre }} {{ room.clienteApellidos }}</td>
            <td>{{ formatDate(room.fechaEntrada) }}</td>
            <td>{{ formatDate(room.fechaSalida) }}</td>
            <td>{{ room.numHabitacion }}</td>
            <td>
              <button class="btn-checkin" @click="goToCheckIn(room.idReserva, room.numHabitacion)">
                <i class="bx bx-log-in"></i> Realizar Check-in
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else>No hay habitaciones para check-in hoy.</p>
    </div>
  </template>
  
  <script>
import { inject, onMounted, onUnmounted, ref } from "vue";
import HeaderComponent from "../Header/HeaderComponent.vue";

export default {
  name: "CheckInListComponent",
  components: { HeaderComponent },

  setup() {
    const socket = inject("socket").getInstance(); // Instancia de Socket.io
    const reservations = ref([]); // Lista de habitaciones con check-in programado

    // Obtener las habitaciones para check-in del día actual
    const fetchTodayCheckIns = async () => {
      try {
        const response = await fetch("http://localhost:3000/reservations/todayCheckIns");
        if (!response.ok) throw new Error("Error al obtener las habitaciones para check-in");
        reservations.value = await response.json();
      } catch (error) {
        console.error("Error al obtener los check-ins del día:", error);
        alert("Error al cargar las habitaciones para check-in.");
      }
    };

    // Formatear fecha en formato legible
    const formatDate = (date) => {
      if (!date) return "-";
      return new Date(date).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // Conectar con sockets para actualización en tiempo real
    onMounted(() => {
      fetchTodayCheckIns();

      // 🔴 Escuchar el evento de actualización de check-ins
      socket.on("actualizarHuespedes", () => {
        console.log("📢 Actualizando lista de check-ins...");
        fetchTodayCheckIns();
      });
    });

    // Limpiar eventos de sockets al desmontar el componente
    onUnmounted(() => {
      socket.off("actualizarHuespedes");
    });

    return { reservations, fetchTodayCheckIns, formatDate };
  },
    created() {
      this.fetchTodayCheckIns();
    },
    methods: {
      goToCheckIn(idReserva, numHabitacion) {
        // Navegar al componente de check-in con los detalles de la habitación
        this.$router.push(`/reception/checkin/${idReserva}/room/${numHabitacion}`);
      },
    },
  };
  </script>
  
  <style scoped>
  .checkin-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20px;
  }
  
  h2 {
    font-size: 24px;
    color: #333;
    margin-bottom: 20px;
  }
  
  table {
    width: 80%;
    border-collapse: collapse;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  thead {
    background-color: #3498db;
    color: white;
  }
  
  th,
  td {
    text-align: left;
    padding: 12px 20px;
    border-bottom: 1px solid #ddd;
  }
  
  tr:hover {
    background-color: #f5f5f5;
  }
  
  .btn-checkin {
    padding: 8px 16px;
    color: white;
    background-color: #4caf50;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .btn-checkin i {
    font-size: 16px;
  }
  
  .btn-checkin:hover {
    background-color: #45a049;
  }
  </style>
  
<template>
  <HeaderComponent />
  <div class="checkout-list">
    <h2>Check-outs de Hoy</h2>
    <table v-if="reservations.length">
      <thead>
        <tr>
          <th>Reserva ID</th>
          <th>Cliente</th>
          <th>Fecha de Entrada</th>
          <th>Fecha de Salida</th>
          <th>Habitaciones</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="reservation in reservations" :key="reservation.idReserva">
          <td>{{ reservation.idReserva }}</td>
          <td>{{ reservation.clienteNombre }} {{ reservation.clienteApellidos }}</td>
          <td>{{ formatDate(reservation.fechaEntrada) }}</td>
          <td>{{ formatDate(reservation.fechaSalida) }}</td>
          <td>
            <ul>
              <li v-for="room in reservation.habitaciones.split(', ')" :key="room">
                {{ room }}
              </li>
            </ul>
          </td>
          <td>
            <button class="btn-checkout" @click="processCheckOut(reservation.idReserva)">
              <i class="bx bx-log-out"></i> Realizar Check-out
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>No hay habitaciones para check-out hoy.</p>
  </div>
</template>

<script>
import { inject, onMounted, onUnmounted, ref } from "vue";
import HeaderComponent from "../Header/HeaderComponent.vue";

export default {
  name: "CheckOutListComponent",
  components: { HeaderComponent },

  setup() {
    const socket = inject("socket").getInstance(); // Obtener instancia de Socket.io
    const reservations = ref([]); // Lista de reservas para check-out hoy

    // Obtener las reservas para check-out del día actual
    const fetchTodayCheckOuts = async () => {
      try {
        const response = await fetch("http://localhost:3000/reservations/todayCheckOuts");
        if (!response.ok) throw new Error("Error al obtener las habitaciones para check-out");
        reservations.value = await response.json();
      } catch (error) {
        console.error("Error al obtener los check-outs del día:", error);
        alert("Error al cargar las habitaciones para check-out.");
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

    // Conectar con sockets
    onMounted(() => {
      fetchTodayCheckOuts();

      // 🔴 Escuchar el evento de actualización de check-outs
      socket.on("actualizarHuespedes", () => {
        console.log("📢 Actualizando lista de check-outs...");
        fetchTodayCheckOuts();
      });
    });

    // Limpiar eventos de sockets al desmontar el componente
    onUnmounted(() => {
      socket.off("actualizarHuespedes");
    });

    return { reservations, fetchTodayCheckOuts, formatDate };
  },
  created() {
    this.fetchTodayCheckOuts();
  },
  methods: {
    async processCheckOut(idReserva) {
      this.$router.push(`/reception/checkout/${idReserva}`);
    },
  },
};
</script>

<style scoped>
.checkout-list {
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
  background-color: #e74c3c;
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

.btn-checkout {
  padding: 8px 16px;
  color: white;
  background-color: #e74c3c;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-checkout i {
  font-size: 16px;
}

.btn-checkout:hover {
  background-color: #c0392b;
}

ul {
  margin: 0;
  padding-left: 20px;
}

li {
  list-style-type: disc;
}
</style>

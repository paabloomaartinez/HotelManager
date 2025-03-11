<template>
  <HeaderComponent />
  <div class="daily-cleaning">
    <h2>Gestión de Limpieza Diaria</h2>
    <template v-if="dirtyRooms.length > 0">
      <table>
        <thead>
          <tr>
            <th>Número de Habitación</th>
            <th>Estado Actual</th>
            <th>Huéspedes</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in dirtyRooms" :key="room.numHabitacion">
            <td>{{ room.numHabitacion }}</td>
            <td>{{ room.estado }}</td>
            <td>
              <ul v-if="room.huespedes">
                <li v-for="(cliente, index) in room.huespedes.split(', ')" :key="index">
                  {{ cliente }}
                </li>
              </ul>
              <span v-else>No asignado</span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn-clean" @click="markAsClean(room)">
                  <i class="bx bx-check-circle"></i> Limpia
                </button>
                <button class="btn-no-clean" @click="skipCleaning(room)">
                  <i class="bx bx-x-circle"></i> No Limpiar
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
    <template v-else>
      <p class="no-dirty-rooms">No hay habitaciones sucias pendientes de limpieza.</p>
    </template>
  </div>
</template>

<script>
import { inject, onMounted, onUnmounted, ref } from "vue";
import HeaderComponent from "../Header/HeaderComponent.vue";

export default {
  name: "DailyCleaningComponent",
  components: { HeaderComponent },

  setup() {
    const socket = inject("socket").getInstance(); // Instancia del socket
    const dirtyRooms = ref([]); // Lista de habitaciones sucias

    const fetchDirtyRooms = async () => {
      try {
        const response = await fetch("http://localhost:3000/rooms/getDirtyRooms");
        if (!response.ok) throw new Error("Error al obtener las habitaciones sucias");
        dirtyRooms.value = await response.json();
      } catch (error) {
        console.error("Error al obtener las habitaciones sucias:", error);
        alert("Error al cargar las habitaciones sucias.");
      }

      console.log("Habitaciones sucias:", dirtyRooms.value);
    };

    // Marcar una habitación como limpia
    const markAsClean = async (room) => {
      try {
        const response = await fetch("http://localhost:3000/rooms/markAsClean", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numHabitacion: room.numHabitacion }),
        });

        if (!response.ok) throw new Error("Error al actualizar la habitación");
        const result = await response.json();
        alert(result.message);

        // Emitir evento para actualizar habitaciones en tiempo real
        socket.emit("actualizarHabitaciones");

      } catch (error) {
        console.error("Error al marcar la habitación como limpia:", error);
        alert("Error al marcar la habitación como limpia.");
      }
    };

    // Omitir la limpieza de una habitación
    const skipCleaning = async (room) => {
      if (!confirm("¿Estás seguro de que deseas omitir la limpieza?")) return;

      try {
        const response = await fetch("http://localhost:3000/rooms/omitCleaning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numHabitacion: room.numHabitacion }),
        });

        if (!response.ok) throw new Error("Error al omitir la limpieza");
        const result = await response.json();
        alert(result.message);

        socket.emit("actualizarHabitaciones");

      } catch (error) {
        console.error("Error al omitir la limpieza:", error);
        alert("Error al omitir la limpieza de la habitación.");
      }
    };

    onMounted(() => {
      fetchDirtyRooms();
      socket.on("actualizarHabitaciones", () => {
        console.log("📢 Actualizando lista de habitaciones sucias...");
        fetchDirtyRooms();
      });
    });

    // Desconectar sockets al desmontar el componente
    onUnmounted(() => {
      socket.off("actualizarHabitaciones");
    });

    return { dirtyRooms, fetchDirtyRooms, markAsClean, skipCleaning };
  },
  created() {
    this.fetchDirtyRooms();
  }
};
</script>

<style scoped>
.daily-cleaning {
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
  width: 50%;
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
  padding: 10px 20px;
  border-bottom: 1px solid #ddd;
}

tr:hover {
  background-color: #f5f5f5;
}

.btn-clean {
  padding: 8px 16px;
  color: white;
  background-color: #4caf50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-clean i {
  font-size: 16px;
}

.btn-clean:hover {
  background-color: #45a049;
}

.btn-no-clean {
  padding: 8px 16px;
  color: white;
  background-color: #f44336;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-no-clean i {
  font-size: 16px;
}

.btn-no-clean:hover {
  background-color: #d32f2f;
}

.no-dirty-rooms {
  margin-top: 20px;
  font-size: 18px;
  color: #666;
  font-weight: bold;
}

.action-buttons {
  display: flex;
}
</style>

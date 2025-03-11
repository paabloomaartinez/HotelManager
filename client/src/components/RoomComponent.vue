<template>
  <header>
    <HeaderComponent />
  </header>
  <div class="room-container">
    <h1>Habitaciones</h1>

    <!-- Filtro por tipo de habitación -->
    <div class="filter-container">
      <label v-for="type in roomTypes" :key="type" class="filter-label">
        <input
          type="checkbox"
          :value="type"
          v-model="selectedTypes"
        />
        {{ type }}
      </label>
    </div>

    <table>
      <thead>
        <tr>
          <th>Número</th>
          <th>Estado</th>
          <th>Tipo</th>
          <th>Numero de camas</th>
          <th>Opción supletoria</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="room in filteredRooms" :key="room.Numero">
          <td>{{ room.Numero }}</td>
          <td v-if="isEditing(room)">
            <select v-model="editableRoom.Estado" class="editable-select">
              <option value="Disponible">Disponible</option>
              <option value="Ocupada">Ocupada</option>
              <option value="Limpia">Limpia</option>
              <option value="Sucia">Sucia</option>
              <option value="Bloqueada">Bloqueada</option>
              <option value="Fuera de Servicio">Fuera de Servicio</option>
            </select>
          </td>
          <td v-else>{{ room.Estado }}</td>
          <td>{{ room.Tipo }}</td>
          <td>{{ room.Num_camas }}</td>
          <td>{{ room.Opcion_supletoria }}</td>
          <td class="actions">
            <i
              class="bx"
              :class="isEditing(room) ? 'bxs-save save-icon' : 'bxs-edit-alt edit-icon'"
              @click="toggleEdit(room)"
              :title="isEditing(room) ? 'Guardar' : 'Modificar'"
              style="cursor: pointer;"
            ></i>
            <i
              v-if="isEditing(room)"
              class="bx bx-x-circle cancel-icon"
              @click="cancelEdit"
              title="Cancelar"
              style="cursor: pointer;"
            ></i>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>


<script>
import HeaderComponent from './Header/HeaderComponent.vue';
import { inject, onMounted, onUnmounted, ref } from "vue";

export default {
  name: "RoomComponent",
  components: {
    HeaderComponent,
  },
  setup() {
    const socket = inject("socket").getInstance();
    
    const rooms = ref([]);

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

    // Función para recargar datos cuando se emita el evento de sockets
    const fetchData = async () => {
      await fetchRooms();
    };

    // Conectar los sockets
    onMounted(() => {
      socket.on("actualizarHabitaciones", fetchData);
      fetchData(); // Obtener datos al cargar el componente
    });

    onUnmounted(() => {
      socket.off("actualizarHabitaciones", fetchData);
    });

    return { rooms, fetchRooms };
  },
  data() {
    return {
      roomTypes: ["Individual", "Doble estandar", "Doble superior", "Suite"], // Tipos de habitación
      selectedTypes: [], // Tipos seleccionados para el filtro
      editingId: null,
      editableRoom: {},
    };
  },
  computed: {
    filteredRooms() {
      // Si no hay filtros seleccionados, mostrar todas las habitaciones
      if (this.selectedTypes.length === 0) {
        return this.rooms;
      }
      // Filtrar habitaciones por tipo
      return this.rooms.filter((room) => this.selectedTypes.includes(room.Tipo));
    },
  },
  created() {
    this.fetchRooms();
  },
  methods: {
    isEditing(room) {
      return this.editingId === room.Numero;
    },
    toggleEdit(room) {
      if (this.isEditing(room)) {
        this.setRoomState();
      } else {
        this.editingId = room.Numero;
        this.editableRoom = { ...room };
      }
    },
    cancelEdit() {
      this.editingId = null;
    },
    setRoomState() {
      fetch(`http://localhost:3000/rooms/setRoomState/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.editableRoom),
      })
        .then((response) => response.json())
        .then(() => {
          const index = this.rooms.findIndex((r) => r.Numero === this.editableRoom.Numero);
          if (index !== -1) {
            this.rooms.splice(index, 1, this.editableRoom);
          }
          this.editingId = null;
        })
        .catch((error) => {
          console.error("Error al actualizar la habitación:", error);
        });
    },
  },
};

</script>

<style>
.room-container {
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.button-container {
  display: flex;
  justify-content: center;
  gap: 20px;
}

h1 {
  text-align: center;
  color: #171a20;
  margin-bottom: 20px;
}

table {
  width: 50%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: 20px;
  margin-bottom: 20px;
}

th, td {
  border-bottom: 1px solid #ddd;
  text-align: left;
  color: #171a20;
  padding: 15px;
}

th {
  background-color: #2c3e50;
  color: white;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

tr:hover {
  background-color: #f1f1f1;
}

.editing-row {
  background-color: #f0f8ff;
}

.editable-input, .editable-select {
  border: 2px solid #4CAF50;
  border-radius: 4px;
  padding: 8px;
  font-size: 14px;
  width: 100%;
}

.actions i {
  font-size: 20px;
  transition: color 0.3s ease;
  padding: 4px 10px;
}

.actions i:hover {
  color: #171a20;
}

.save-icon {
  color: #4CAF50;
}

.edit-icon {
  color: #2196f3;
}

.cancel-icon {
  color: #f44336;
}

.delete-icon {
  color: #f44336;
}

@media (max-width: 768px) {
  table {
    width: 100%;
  }
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  width: 400px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.modal-content form {
  display: flex;
  flex-direction: column;
}

.modal-content label {
  margin-bottom: 8px;
  font-weight: bold;
}

.modal-content input, .modal-content select {
  margin-bottom: 15px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.modal-content form {
  display: flex;
  flex-direction: column;
}

.modal-content .button-group {
  display: flex;
  justify-content: space-between; /* Espaciado entre los botones */
  margin-top: 10px;
}

.modal-content .button-group button {
  flex: 1; /* Para que ambos botones tengan el mismo tamaño */
  margin: 0 5px; /* Espaciado entre los botones */
}

.btn-add {
  padding: 12px 20px;
  font-size: 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  height: 44px;
}

.btn-save {
  padding: 12px 20px;
  font-size: 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  height: 44px;
}

.btn-cancel {
  background-color: #f9f9f9;
  color: #333;
  padding: 12px 20px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s ease-in-out;
}

.filter-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  gap: 15px;
}

.filter-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #333;
}

.filter-label input {
  margin-right: 8px;
  cursor: pointer;
}
</style>
<template>
  <HeaderComponent />
  <div class="reservation-details-container">
    <!-- Modal de selección de modificación -->
    <transition name="fade">
      <div v-if="showModificationOptions && !showCalendarForm && !showServices && !showRooms && !showPersonsForm" class="modification-options">
        <h3>¿Qué desea modificar?</h3>
        <div class="selection-options">
          <button class="button-primary" @click="showCalendarForm = true">
            Fechas de Entrada y Salida
          </button>
          <button class="button-primary" @click="showPersonsForm = true">
            Número de Personas
          </button>
          <button class="button-primary" @click="showServices = true">
            Servicios Contratados
          </button>
          <button class="button-primary" @click="showRoomsFunction">
            Habitaciones
          </button>
        </div>
        <button class="button-secondary" @click="showModificationOptions = false">Cancelar</button>
      </div>
    </transition>

    <!-- Formulario de modificación de fechas -->
    <transition name="fade">
      <div class="reservation-form" v-if="showCalendarForm">
        <h2>Modificar Fechas</h2>
        <form class="horizontal-form">
          <div class="form-group">
            <label for="checkInDate">Fecha de Entrada</label>
            <input
              type="text"
              id="checkInDate"
              :value="formattedCheckInDate"
              placeholder="Seleccionar fecha de entrada"
              readonly
              @focus="openCalendar"
            />
          </div>
          <div class="form-group">
            <label for="checkOutDate">Fecha de Salida</label>
            <input
              type="text"
              id="checkOutDate"
              :value="formattedCheckOutDate"
              placeholder="Seleccionar fecha de salida"
              readonly
              @focus="openCalendar"
            />
          </div>
          <button type="button" class="button-primary" @click="confirmDateChanges">Confirmar cambios</button>
          <button type="button" class="button-secondary" @click="cancelAndGoBack">Cancelar</button>
        </form>

          <!-- Calendario -->
        <div v-if="showCalendar" class="calendar-container">
          <calendar-range
            :months="2"
            :min="minDate"
            v-model.lazy="selectedDateRange"
            @change="handleDateChange"
          >
            <div class="grid">
              <calendar-month />
              <calendar-month :offset="1" />
            </div>
          </calendar-range>
        </div>
      </div>
    </transition>
    
    <transition name="fade">
      <div class="reservation-form" v-if="showServices">
        <h2>Modificar Servicios extra</h2>
        <div class="form-group">
          <div class="services">
            <label>
              <input
                type="checkbox"
                value="Parking"
                v-model="form.services"
              />
              Parking (€10 por noche)
            </label>
            <label>
              <input
                type="checkbox"
                value="Desayuno"
                v-model="form.services"
              />
              Desayuno (€15 por persona por noche)
            </label>
            <label>
              <input
                type="checkbox"
                value="Supletoria"
                v-model="form.services"
              />
              Cama supletoria (€25 por noche)
            </label>
          </div>
        </div>
        <button type="button" class="button-primary" @click="confirmServiceChanges">Confirmar cambios</button>
        <button type="button" class="button-secondary" @click="cancelAndGoBackService">Cancelar</button>
      </div>
    </transition>

    <transition name="fade">
      <div class="reservation-form-rooms" v-if="showRooms">
        <h2>Modificar habitaciones</h2>
        <div class="room-list">
          <h3>Habitaciones Disponibles</h3>
          <button type="button" class="button-primary" @click="confirmRoomChanges">Confirmar cambios</button>
          <button type="button" class="button-secondary" @click="cancelAndGoBackRooms">Cancelar</button>
          <div v-if="availableRooms.length > 0" class="room-grid">
            <div
              v-for="room in availableRooms"
              :key="room.Numero"
              class="room-card"
              @click="toggleRoomSelection(room)"
              :class="{ selected: selectedRooms.some(selectedRoom => selectedRoom.Numero === room.Numero) }"
            >
              <h4>Habitación {{ room.Numero }}</h4>
              <p>Tipo: {{ room.Tipo }}</p>
              <p>Camas: {{ room.Num_camas }}</p>
              <p>Tarifa: {{ room.Tarifa }} €</p>
            </div>
          </div>
          <div v-else class="no-rooms">
            <p>No hay habitaciones disponibles para las fechas seleccionadas.</p>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div class="reservation-form" v-if="showPersonsForm">
        <h2>Modificar Número de Personas</h2>
        <form class="horizontal-form">
          <div class="form-group">
            <label for="numPersons">Número de Personas</label>
            <input
              type="number"
              id="numPersons"
              v-model="form.numPersons"
              min="1"
              placeholder="Ingrese el número de personas"
            />
          </div>
          <button type="button" class="button-primary" @click="confirmPersonChanges">Confirmar cambios</button>
          <button type="button" class="button-secondary" @click="cancelAndGoBackPersons">Cancelar</button>
        </form>
      </div>
    </transition>

    <!-- Resumen de la reserva -->
    <transition name="fade">
      <div class="reservation-summary">
        <h3>Detalles de la Reserva</h3>
        <div class="summary-item">
          <p><strong>Localizador:</strong> {{ reservation?.idReserva }}</p>
          <p><strong>Cliente:</strong> {{ reservation?.clienteNombre }}</p>
          <p><strong>Fecha de Entrada:</strong> {{ formatDate(reservation?.fechaEntrada) }}</p>
          <p><strong>Fecha de Salida:</strong> {{ formatDate(reservation?.fechaSalida) }}</p>
          <p><strong>Número de Personas:</strong> {{ reservation?.numPersonas }}</p>
          <p><strong>Estado:</strong> {{ reservation?.estado }}</p>
        </div>
        <div class="summary-item">
          <h4>Habitaciones</h4>
          <ul>
            <li v-for="room in reservation?.habitaciones" :key="room.numHabitacion">
              Número: {{ room.numHabitacion }} ({{ room.tipoHabitacion }})
            </li>
          </ul>
        </div>
        <div class="summary-item" v-if="reservation?.servicios?.length">
          <h4>Servicios Contratados</h4>
          <ul>
            <li v-for="(service, index) in reservation?.servicios" :key="index">
              {{ service }}
            </li>
          </ul>
        </div>
        <div class="summary-item">
          <p><strong>Precio Total:</strong> €{{ reservation?.precio }}</p>
        </div>
        <div v-if="!showModificationOptions" class="action-buttons">
          <button @click="showModificationOptions = true" class="button-primary">Modificar Reserva</button>
          <button @click="cancelReservation" class="button-danger">Cancelar Reserva</button>
          <button @click="goBack" class="button-secondary">Volver</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import HeaderComponent from '../Header/HeaderComponent.vue';
import { useRoute } from 'vue-router';
import { inject, onMounted, onUnmounted, ref } from "vue";

export default {
  name: "ReservationDetails",
  components: { HeaderComponent },
  setup() {
    const socket = inject("socket").getInstance();
    
    const reservation = ref(null); // Estado reactivo para reservas
    const route = useRoute();

    const fetchReservationDetails = async () => {
      const id = route.params.id;
      try {
        const response = await fetch(`http://localhost:3000/reservations/getReservationDetails/${id}`);
        if (!response.ok) throw new Error("Error al obtener los detalles de la reserva");
        reservation.value = await response.json();
      } catch (error) {
        console.error(error);
        alert("Error al cargar los detalles de la reserva.");
      }
    };

    // Función para recargar datos cuando se emita el evento de sockets
    const fetchData = async () => {
      await fetchReservationDetails();
    };

    // Conectar los sockets
    onMounted(() => {
      socket.on("actualizarReservas", fetchData);
      fetchData(); // Obtener datos al cargar el componente
    });

    onUnmounted(() => {
      socket.off("actualizarReservas", fetchData);
    });

    return { reservation, fetchReservationDetails };
  },
  data() {
    return {
      showModificationOptions: false, // Mostrar las opciones de modificación
      showCalendarForm: false, // Mostrar el formulario de fechas
      showCalendar: false, // Mostrar el calendario
      showServices: false,
      showRooms: false,
      showPersonsForm: false,
      form: {
        checkInDate: "",
        checkOutDate: "",
        numPersons: 1,
        services: [],
      },
      minDate: new Date().toISOString().split("T")[0], // Fecha mínima para selección
      selectedDateRange: "",
      availableRooms: [],
      selectedRooms: [],
      isRoomsSearched: false,
      isLoading: false,
    };
  },
  computed: {
    formattedCheckInDate() {
      return this.form.checkInDate
        ? new Date(this.form.checkInDate).toLocaleDateString()
        : "Seleccionar fecha de entrada";
    },
    formattedCheckOutDate() {
      return this.form.checkOutDate
        ? new Date(this.form.checkOutDate).toLocaleDateString()
        : "Seleccionar fecha de salida";
    },
  },
  created() {
    this.fetchReservationDetails();
  },
  methods: {
    formatDate(date) {
      if (!date) return "-";
      return new Date(date).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    },
    async confirmDateChanges() {
      if (!this.form.checkInDate || !this.form.checkOutDate) {
        alert("Por favor, selecciona fechas válidas.");
        return;
      }

      if (confirm("¿Estás seguro de que deseas modificar las fechas?")) {
        try {
          const response = await fetch("http://localhost:3000/reservations/updateReservationDays", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idReserva: this.reservation.idReserva,
              checkInDate: this.form.checkInDate,
              checkOutDate: this.form.checkOutDate,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            alert(`Error: ${errorData.error}`);
            return;
          }

          const result = await response.json();
          alert(result.message);

          // Actualizar el precio con el nuevo valor
          this.reservation.precio = result.newPrice;

          // Refrescar los detalles de la reserva después de la actualización
          await this.fetchReservationDetails();

          // Ocultar formularios
          this.showCalendarForm = false;
          this.showModificationOptions = false;
        } catch (error) {
          console.error("Error al actualizar las fechas de la reserva:", error);
          alert("Hubo un problema al actualizar las fechas. Intenta de nuevo.");
        }
      }
    },
    async confirmServiceChanges() {
      if (!this.form.services.length) {
        alert("Por favor, selecciona al menos un servicio.");
        return;
      }

      if (confirm("¿Estás seguro de que deseas modificar los servicios?")) {
        try {
          const response = await fetch("http://localhost:3000/reservations/updateReservationServices", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idReserva: this.reservation.idReserva,
              newServices: this.form.services,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            alert(`Error: ${errorData.error}`);
            return;
          }

          const result = await response.json();
          alert(result.message);

          // Actualizar el precio con el nuevo valor
          this.reservation.precio = result.newPrice;

          // Refrescar los detalles de la reserva después de la actualización
          await this.fetchReservationDetails();

          // Ocultar formularios
          this.showServices = false;
          this.showModificationOptions = false;
          this.form.services = []
        } catch (error) {
          console.error("Error al actualizar los servicios de la reserva:", error);
          alert("Hubo un problema al actualizar los servicios. Intenta de nuevo.");
        }
      }
    },
    async confirmRoomChanges() {
      if (!this.selectedRooms.length) {
        alert("Por favor, selecciona al menos una habitación.");
        return;
      }

      if (confirm("¿Estás seguro de que deseas modificar las habitaciones?")) {
        try {
          // Realizar la llamada al backend
          const response = await fetch("http://localhost:3000/reservations/updateReservationRooms", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idReserva: this.reservation.idReserva, // ID de la reserva
              selectedRooms: this.selectedRooms, // Habitaciones seleccionadas con su información
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            alert(`Error: ${errorData.error}`);
            return;
          }

          const result = await response.json();
          alert(result.message);

          // Actualizar el precio con el nuevo valor
          this.reservation.precio = result.newPrice;

          // Refrescar los detalles de la reserva después de la actualización
          await this.fetchReservationDetails();

          // Ocultar formularios
          this.showRooms = false;
          this.showModificationOptions = false;
          this.selectedRooms = [];
          this.availableRooms = [];
        } catch (error) {
          console.error("Error al actualizar las habitaciones de la reserva:", error);
          alert("Hubo un problema al actualizar las habitaciones. Intenta de nuevo.");
        }
      }
    },
    async confirmPersonChanges() {
      if (this.form.numPersons < 1) {
        alert("El número de personas debe ser al menos 1.");
        return;
      }

      if (confirm("¿Estás seguro de que deseas modificar el número de personas?")) {
        try {
          const response = await fetch("http://localhost:3000/reservations/updateReservationPersons", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idReserva: this.reservation.idReserva,
              numPersons: this.form.numPersons,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            alert(`Error: ${errorData.error}`);
            return;
          }

          const result = await response.json();
          alert(result.message);

          // Actualizar el precio con el nuevo valor
          this.reservation.precio = result.newPrice;

          // Refrescar los detalles de la reserva después de la actualización
          await this.fetchReservationDetails();

          // Ocultar formulario
          this.showPersonsForm = false;
          this.showModificationOptions = false;
        } catch (error) {
          console.error("Error al actualizar el número de personas:", error);
          alert("Hubo un problema al actualizar el número de personas. Intenta de nuevo.");
        }
      }
    },
    async cancelReservation() {
      if (!confirm("¿Estás seguro de que deseas cancelar esta reserva?")) {
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/reservations/cancelReservation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idReserva: this.reservation.idReserva,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Error: ${errorData.error}`);
          return;
        }

        const result = await response.json();
        alert(result.message);

        // Redirigir al listado de reservas o actualizar el estado actual
        this.$router.push("/reception/reservations");
      } catch (error) {
        console.error("Error al cancelar la reserva:", error);
        alert("Hubo un problema al cancelar la reserva. Intenta de nuevo.");
      }
    },

    showRoomsFunction() {
      this.searchRooms();
      this.showRooms = true;
    },
    async searchRooms() {
      
      this.isLoading = true;
      try {
        const response = await fetch("http://localhost:3000/reservations/available", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkInDate: this.reservation.fechaEntrada,
            checkOutDate: this.reservation.fechaSalida,
            services: this.reservation.servicios,
          }),
        });

        if (!response.ok) throw new Error("Error al buscar habitaciones");

        this.availableRooms = await response.json();
        this.isRoomsSearched = true;
      } catch (error) {
        console.error(error);
        alert("Error al buscar habitaciones");
      } finally {
        this.isLoading = false;
      }
    },
    toggleRoomSelection(room) {
      const index = this.selectedRooms.findIndex(
        (selectedRoom) => selectedRoom.Numero === room.Numero
      );
      if (index > -1) {
        this.selectedRooms.splice(index, 1); // Quitar si ya está seleccionada
      } else {
        this.selectedRooms.push({ Numero: room.Numero, Tarifa: room.Tarifa, Tipo: room.Tipo }); // Añadir si no está seleccionada
      }
    },
    cancelAndGoBack() {
      this.showCalendar = false;
      this.showCalendarForm = false;
    },
    cancelAndGoBackService() {
      this.showServices = false;
      this.form.services = [];
    },
    cancelAndGoBackRooms() {
      this.showRooms = false;
      this.form.services = [];
    },
    cancelAndGoBackPersons() {
      this.showPersonsForm = false;
      this.form.numPersons = this.reservation.numPersonas; // Restablece el valor inicial
    },
    goBack() {
      this.$router.push("/reception/reservations");
    },
    openCalendar() {
      this.showCalendar = true;
    },
    handleDateChange(event) {
      const range = event.target.value || this.selectedDateRange;
      if (range) {
        const [start, end] = range.split("/");
        this.form.checkInDate = start;
        this.form.checkOutDate = end;
        this.showCalendar = false;
      }
    },
  },
};
</script>

<style scoped>
.reservation-details-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  height: 100vh;
  gap: 40px;
  padding: 20px;
}
.modification-options {
  padding: 20px;
  width: 300px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.reservation-summary {
  padding: 20px;
  width: 400px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.reservation-summary h3,
.modification-options h3,
.reservation-form h2 {
  margin-bottom: 15px;
  font-size: 20px;
  color: #333;
  border-bottom: 2px solid #3498db;
  padding-bottom: 5px;
}

.action-buttons {
  display: flex;
  justify-content:center;
}

.button-primary,
.button-secondary,
.button-danger {
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  color: #fff;
  margin-top: 10px;
  margin-right: 5px;
}

.button-primary {
  background: #007bff;
}

.button-primary:hover {
  background: #0056b3;
}

.button-secondary {
  background: #6c757d;
}

.button-secondary:hover {
  background: #5a6268;
}

.button-danger {
  background: #dc3545;
}

.button-danger:hover {
  background: #c82333;
}

.calendar-container {
  margin-top: 20px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
}

.selection-options {
  gap: 0;
  display: flex;
  flex-direction: column;
}

.grid {
  display: flex;
  gap: 1.5em;
  flex-wrap: wrap;
  justify-content: center;
}

calendar-range {
  &::part(button) {
    border: 1px solid #adb5bd;
    background-color: #fff;
    border-radius: 3px;
    width: 60px;
    height: 26px;
  }

  &::part(button):focus-visible {
    outline: 2px solid #3498db;
  }
}

calendar-month {
  --color-accent: #2f7db1;
  --color-text-on-accent: #ffffff;

  &::part(button) {
    border-radius: 3px;
  }

  &::part(range-inner) {
    border-radius: 0;
    background-color: #3498db;
  }

  &::part(range-start) {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }

  &::part(range-end) {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }

  &::part(range-start range-end) {
    border-radius: 3px;
  }
}

.reservation-summary h4 {
  margin-top: 10px;
  margin-bottom: 5px;
  color: #333;
}

.summary-item {
  background: #ffffff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 15px;
  margin-bottom: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.summary-item p {
  margin: 5px 0;
  font-size: 14px;
  color: #555;
}

.summary-item strong {
  color: #333;
}

.summary-item ul {
  padding-left: 20px;
  list-style: none;
  margin: 0;
}

.reservation-form {
  max-width: 1200px;
  padding: 20px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  margin-left: 10%;
}

.reservation-form-rooms {
  width: 1000px;
  padding: 20px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  margin-left: 10%;
}

.horizontal-form {
  display: flex;
  align-items: flex-end;
  gap: 20px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}

label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #555;
}

input, select {
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

input:focus {
  border-color: #3498db;
  outline: none;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.room-list h3 {
  margin-bottom: 10px;
  font-size: 16px;
  color: #555;
}

.room-list .button-primary{
  margin-bottom: 10px;
}

.room-card {
  padding: 15px;
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  margin-bottom: 10px;
}

.room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.room-card.selected {
  background: #3498db;
  color: #fff;
  border-color: #3498db;
}
</style>
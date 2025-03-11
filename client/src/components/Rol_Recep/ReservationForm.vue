<template>
  <HeaderComponent />
  <div class="reservation">

    <transition name="fade">
      <div class="reservation-form" v-if="!showCustomerForm">
        <h2>Formulario de Reserva</h2>

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

          <div class="form-group">
            <label for="numGuests">Número de Personas</label>
            <input
              type="number"
              id="numGuests"
              v-model.number="form.numGuests"
              min="1"
              placeholder="Número de personas"
              required
            />
          </div>

          <!-- Select para tipo de habitación -->
          <div class="form-group">
            <label for="roomType">Tipo de Habitación</label>
            <select id="roomType" v-model="form.roomType" required>
              <option value="">Seleccionar tipo</option>
              <option value="Individual">Individual</option>
              <option value="Doble estandar">Doble estándar</option>
              <option value="Doble superior">Doble superior</option>
              <option value="Suite">Suite</option>
            </select>
          </div>

          <button
            type="button"
            @click="searchRooms"
            class="button-primary"
            :disabled="isLoading || !form.checkInDate || !form.checkOutDate || !form.numGuests || !form.roomType"
          >
            Buscar Habitaciones
          </button>

          <button
            type="button"
            class="button-secondary cancel-button"
            @click="cancelAndGoBack"
          >
            Cancelar
          </button>
        </form>

        <div class="form-group">
          <label>Servicios Extras</label>
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

        <div v-if="isRoomsSearched" class="room-list">
          <h3>Habitaciones Disponibles</h3>
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
      <div v-if="showCustomerForm" class="customer-form">
        <h3>Datos del Cliente</h3>
        <form @submit.prevent="submitReservation">
          <div class="form-group">
            <label for="customerFullName">Nombre Completo</label>
            <input
              type="text"
              id="customerFullName"
              v-model="customerData.fullName"
              placeholder="Nombre completo"
              required
            />
          </div>
          <div class="form-group">
            <label for="customerEmail">Correo Electrónico</label>
            <input
              type="email"
              id="customerEmail"
              v-model="customerData.email"
              placeholder="Correo electrónico"
              required
            />
          </div>
          <div class="form-group">
            <label for="customerPhone">Teléfono</label>
            <input
              type="tel"
              id="customerPhone"
              v-model="customerData.phone"
              placeholder="Teléfono"
              required
            />
          </div>
          <div class="form-group">
            <label for="specialRequests">Solicitudes Especiales</label>
            <textarea
              id="specialRequests"
              v-model="customerData.notes"
              placeholder="Especificar solicitudes especiales"
            ></textarea>
          </div>
          <button type="submit" class="button-primary">Confirmar Reserva</button>
          <button
            type="button"
            class="button-secondary"
            @click="showCustomerForm = false"
          >
            Cancelar
          </button>
        </form>
      </div>
    </transition>

    <div v-if="calculateTotalCost() > 0 && isRoomsSearched" class="reservation-summary-container">
      <div class="reservation-summary">
        <h3>Resumen de la Reserva</h3>

        <div class="summary-item">
          <p><strong>Fecha de Entrada:</strong> {{ formattedCheckInDate }}</p>
          <p><strong>Fecha de Salida:</strong> {{ formattedCheckOutDate }}</p>
          <p><strong>Número de personas:</strong> {{ form.numGuests }}</p>
        </div>

        <div v-for="(room, index) in selectedRooms" :key="room.Numero" class="summary-item">
          <div class="summary-item-header">
            <p><strong>Habitación:</strong> {{ room.Numero }}</p>
        <button v-if="!showCustomerForm" class="remove-item bx bx-trash delete-icon" @click="removeRoom(index)" aria-label="Eliminar habitación" />
          </div>
          <p><strong>Precio por noche:</strong> {{ room.Tarifa }} €</p>
          <p><strong>Noches:</strong> {{ totalNights }}</p>
          <p><strong>Total Habitación:</strong> {{ room.Tarifa * totalNights }} €</p>
        </div>
        <div v-if="form.services.includes('Parking')" class="summary-item">
          <p><strong>Parking:</strong> €10 por noche</p>
          <p><strong>Total Parking:</strong> €{{ totalNights * 10 }}</p>
        </div>
        <div v-if="form.services.includes('Desayuno')" class="summary-item">
          <p><strong>Desayuno:</strong> €15 por persona por noche</p>
          <p>
            <strong>Total Desayuno:</strong>
            €{{ totalNights * 15 * form.numGuests }}
          </p>
        </div>
        <div v-if="form.services.includes('Supletoria')" class="summary-item">
          <p><strong>Cama supletoria:</strong> €25 por noche</p>
          <p><strong>Total Cama supletoria:</strong> €{{ totalNights * 25 }}</p>
        </div>
        <div class="total-cost">
          <p><strong>Total Estancia:</strong> €{{ calculateTotalCost() }}</p>
        </div>
      </div>
      <button
        @click="showCustomerForm = true"
        class="button-primary reserve-button"
        :disabled="!selectedRooms.length"
        v-if="!showCustomerForm"
      >
        Reservar
      </button>
    </div>
  </div>
</template>

<script>
import "cally";
import HeaderComponent from '../Header/HeaderComponent.vue';

export default {
  name: "ReservationForm",
  components: {
    HeaderComponent
  },
  data() {
    return {
      form: {
        checkInDate: "",
        checkOutDate: "",
        numGuests: 1,
        roomType: "",
        services: [],
      },
      customerData: {
        fullName: "",
        email: "",
        phone: "",
        notes: "",
      },
      selectedDateRange: "",
      showCalendar: false,
      availableRooms: [],
      selectedRooms: [],
      isRoomsSearched: false,
      isLoading: false,
      showCustomerForm: false,
      minDate: new Date().toISOString().split("T")[0],
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
    totalNights() {
      const checkIn = new Date(this.form.checkInDate);
      const checkOut = new Date(this.form.checkOutDate);
      return (checkOut - checkIn) / (1000 * 60 * 60 * 24); // Diferencia en días
    },
  },
  methods: {
    handleDateChange(event) {
      const range = event.target.value || this.selectedDateRange;
      if (range) {
        const [start, end] = range.split("/");
        this.form.checkInDate = start;
        this.form.checkOutDate = end;
        this.showCalendar = false;
      }
    },
    async searchRooms() {
      this.isLoading = true;
      try {
        const response = await fetch("http://localhost:3000/reservations/available", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkInDate: this.form.checkInDate,
            checkOutDate: this.form.checkOutDate,
            roomType: this.form.roomType,
            services: this.form.services,
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

    cancelAndGoBack() {
      this.$router.push("/reception/reservations");
    },

    handleClickOutside(event) {
      const calendarElement = document.querySelector(".calendar-container");
      const checkInInput = document.getElementById("checkInDate");
      const checkOutInput = document.getElementById("checkOutDate");

      if (
        calendarElement &&
        !calendarElement.contains(event.target) &&
        checkInInput !== event.target &&
        checkOutInput !== event.target
      ) {
        this.showCalendar = false;
        document.removeEventListener("click", this.handleClickOutside);
      }
    },
    openCalendar() {
      this.showCalendar = true;
      document.addEventListener("click", this.handleClickOutside);
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
    removeRoom(index) {
      this.selectedRooms.splice(index, 1);
    },
    calculateTotalCost() {
      let total = this.selectedRooms.reduce(
        (acc, room) => acc + room.Tarifa * this.totalNights,
        0
      );
      if (this.form.services.includes("Parking")) {
        total += this.totalNights * 10;
      }
      if (this.form.services.includes("Desayuno")) {
        total += this.totalNights * 15 * this.form.numGuests;
      }
      if (this.form.services.includes("Supletoria")) {
        total += this.totalNights * 25;
      }
      return total;
    },
    async submitReservation() {
      const reservationData = {
        client: {
          fullName: this.customerData.fullName,
          email: this.customerData.email,
          phone: this.customerData.phone,
        },
        checkInDate: this.form.checkInDate,
        checkOutDate: this.form.checkOutDate,
        numGuests: this.form.numGuests,
        price: this.calculateTotalCost(),
        selectedRooms: this.selectedRooms.map((room) => ({
          Numero: room.Numero,
          opcionSupletoria: room.opcionSupletoria || false, // Campo opcional
        })),
        selectedServices: this.form.services, // Lista de servicios seleccionados
        notes: this.customerData.notes || null, // Notas adicionales
      };

      console.log("Datos de la reserva:", JSON.stringify(reservationData));

      try {
        const response = await fetch("http://localhost:3000/reservations/makeReservation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reservationData),
        });

        if (!response.ok) {
          throw new Error("Error al confirmar la reserva.");
        }

        const result = await response.json();

        console.log("Reserva confirmada con éxito:", result);
        alert("Reserva confirmada con éxito");
        this.resetForm();
      } catch (error) {
        console.error("Error al confirmar la reserva:", error);
        alert("Hubo un problema al confirmar la reserva. Intenta de nuevo.");
      }
    },
    resetForm() {
      this.form = {
        checkInDate: "",
        checkOutDate: "",
        numGuests: 1,
        roomType: "",
        services: [],
      };
      this.customerData = {
        fullName: "",
        email: "",
        phone: "",
        notes: "",
      };
      this.selectedRooms = [];
      this.showCustomerForm = false;
      this.isRoomsSearched = false;
      this.$router.push("/reception/reservations");
    },
  },
};
</script>

<style scoped>
/* Contenedor principal */
.reservation {
  display: flex;
  gap: 20px;
  padding: 20px;
  box-sizing: border-box;
}

.home-container::-webkit-scrollbar {
  width: 8px;
}

.home-container::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: 4px;
}

.home-container::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

.reservation-form {
  max-width: 1200px;
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

.services {
  display: flex;
  gap: 5px;
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

.button-primary {
  padding: 12px 20px;
  font-size: 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  height: 44px;
}

.button-primary:disabled {
  background-color: #87c1e6;
  cursor: not-allowed;
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

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
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

.reservation-summary {
  flex-grow: 1; /* Permite que el resumen ocupe más espacio disponible */
  width: 300px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow-y: auto; /* Permite desplazamiento si el contenido es demasiado grande */
  max-height: calc(100vh - 40px); /* Altura máxima dinámica basada en la ventana */
}

.reserve-button {
  width: 100%;
  margin-top: 20px;
}

.reservation-summary h3 {
  margin-bottom: 15px;
  font-size: 20px;
  color: #333;
  border-bottom: 2px solid #3498db;
  padding-bottom: 5px;
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

.total-cost {
  margin-top: 20px;
  padding: 15px;
  color: #333;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  border-radius: 8px;
}

.total-cost p {
  margin: 0;
}

.summary-item-header {
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.remove-item {
  background: none;
  border: none;
  color: #e74c3c;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.remove-item:hover {
  color: #c0392b;
}

.remove-item:focus {
  outline: 2px solid #c0392b;
}

.customer-form {
  width: 300px;
  padding: 20px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  margin-left: 30%;
}

.customer-form h3 {
  margin-bottom: 15px;
  font-size: 20px;
  color: #333;
  border-bottom: 2px solid #3498db;
  padding-bottom: 5px;
}

.customer-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.customer-form label {
  font-size: 14px;
  color: #555;
}

.customer-form input,
.customer-form textarea {
  padding: 12px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
  transition: border-color 0.2s ease-in-out;
}

.customer-form input:focus,
.customer-form textarea:focus {
  border-color: #3498db;
  outline: none;
}

.customer-form textarea {
  resize: vertical;
  min-height: 100px;
}

.customer-form .button-primary {
  margin-top: 10px;
  background-color: #3498db;
  color: white;
  padding: 12px 20px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s ease-in-out;
}

.customer-form .button-primary:hover {
  background-color: #2179b8;
}

.customer-form .button-secondary {
  margin-top: 10px;
  margin-left: 5px;
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

.customer-form .button-secondary:hover {
  background-color: #e6e6e6;
}

.button-secondary.cancel-button {
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

.button-secondary.cancel-button:hover {
  background-color: #e6e6e6;
}
</style>

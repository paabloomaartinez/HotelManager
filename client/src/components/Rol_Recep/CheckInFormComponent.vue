<template>
  <HeaderComponent />
  <div class="checkin-form">
    <h2>Registro de Huéspedes para la Habitación {{ numHabitacion }}</h2>
    <form @submit.prevent="submitGuests">
      <div v-for="(guest, index) in filteredGuests" :key="index" class="guest-form">
        <h3>Huésped {{ index + 1 }}</h3>
        <div class="form-grid">
          <div class="form-column">
            <div class="form-item">
              <label>Tipo de Documento:</label>
              <select v-model="guest.tipoDocumento" required>
                <option value="DNI">DNI</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
            <div class="form-item">
              <label>Número de Documento:</label>
              <input type="text" v-model="guest.numeroDocumento" required />
            </div>
            <div class="form-item">
              <label>Nombre:</label>
              <input type="text" v-model="guest.nombre" required />
            </div>
            <div class="form-item">
              <label>Apellidos:</label>
              <input type="text" v-model="guest.apellidos" required />
            </div>
            <div class="form-item">
              <label>Fecha de Nacimiento:</label>
              <input type="date" v-model="guest.fechaNacimiento" required />
            </div>
            <div class="form-item">
              <label>Fecha de Emisión:</label>
              <input type="date" v-model="guest.fechaEmision" required />
            </div>
          </div>
          <div class="form-column">
            <div class="form-item">
              <label>Fecha de Caducidad:</label>
              <input type="date" v-model="guest.fechaCaducidad" required />
            </div>
            <div class="form-item">
              <label>Nacionalidad:</label>
              <input type="text" v-model="guest.nacionalidad" required />
            </div>
            <div class="form-item">
              <label>Dirección:</label>
              <input type="text" v-model="guest.direccion" required />
            </div>
            <div class="form-item">
              <label>Hijo/a de:</label>
              <input type="text" v-model="guest.hijoDe" />
            </div>
            <div class="form-item">
              <label>Lugar de Nacimiento:</label>
              <input type="text" v-model="guest.lugarNacimiento" required />
            </div>
            <div class="form-item-sexo">
              <label>Sexo:</label>
              <select v-model="guest.sexo" required>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="button-container">
        <button type="submit" class="btn-submit">Guardar</button>
        <button type="button" class="btn-cancel" @click="cancel">Cancelar</button>
      </div>
    </form>
  </div>
</template>

<script>
import HeaderComponent from '../Header/HeaderComponent.vue';

export default {
  name: "CheckInFormComponent",
  components: {
    HeaderComponent,
  },
  data() {
    return {
      guests: [],
      idReserva: this.$route.params.id,
      numHabitacion: this.$route.params.numHabitacion,
      capacidad: 0,
      camaSupletoriaReservada: false,
    };
  },
  computed: {
    filteredGuests() {
      return this.guests.filter((_, index) => index <= this.guests.findIndex(guest => !this.isGuestComplete(guest)));
    },
  },
  created() {
    this.fetchRoomDetails();
  },
  methods: {
    async fetchRoomDetails() {
      try {
        const response = await fetch(
          `http://localhost:3000/rooms/getRoomDetails/${this.idReserva}/${this.numHabitacion}`
        );
        if (!response.ok) throw new Error("Error al obtener los detalles de la habitación");
        const roomDetails = await response.json();

        this.capacidad = roomDetails.numCamas;
        this.camaSupletoriaReservada = roomDetails.supletoriaReservada;

        const totalGuests = this.capacidad + (this.camaSupletoriaReservada ? 1 : 0);
        this.initializeGuestForms(totalGuests);
      } catch (error) {
        console.error("Error al obtener los detalles de la habitación:", error);
        alert("Error al cargar los detalles de la habitación.");
      }
    },
    initializeGuestForms(totalGuests) {
      this.guests = Array.from({ length: totalGuests }, () => ({
        tipoDocumento: "DNI",
        numeroDocumento: "",
        nombre: "",
        apellidos: "",
        fechaNacimiento: "",
        fechaEmision: "",
        fechaCaducidad: "",
        nacionalidad: "",
        direccion: "",
        hijoDe: "",
        lugarNacimiento: "",
        sexo: "",
      }));
    },
    isGuestComplete(guest) {
      return (
        guest.tipoDocumento &&
        guest.numeroDocumento &&
        guest.nombre &&
        guest.apellidos &&
        guest.fechaNacimiento &&
        guest.fechaEmision &&
        guest.fechaCaducidad &&
        guest.nacionalidad &&
        guest.direccion &&
        guest.lugarNacimiento &&
        guest.sexo
      );
    },
    async submitGuests() {
      try {
        const response = await fetch("http://localhost:3000/reservations/registerGuestsForRoom", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idReserva: this.idReserva,
            numHabitacion: this.numHabitacion,
            guests: this.guests,
          }),
        });

        if (!response.ok) throw new Error("Error al registrar los huéspedes");

        const result = await response.json();
        alert(result.message);

        this.$router.push("/reception/checkin");
      } catch (error) {
        console.error("Error al registrar los huéspedes:", error);
        alert("Error al registrar los huéspedes.");
      }
    },
    cancel() {
      this.$router.push("/reception/checkin");
    },
  },
};
</script>

<style scoped>
.checkin-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  margin: 20px;
}

h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 20px;
}

form {
  width: 50%;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.guest-form {
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item-sexo label{
 margin-right: 10px;
}

label {
  font-size: 16px;
  color: #333;
}

input,
select {
  width: 90%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.button-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.btn-submit,
.btn-cancel {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-submit {
  background-color: #4caf50;
  color: white;
}

.btn-submit:hover {
  background-color: #45a049;
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

.btn-cancel:hover {
  background-color: #e6e6e6;
}
</style>

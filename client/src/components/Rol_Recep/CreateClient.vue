<template>
  <HeaderComponent />
  <div class="create-client-container">
    <h1>Registro de Cliente</h1>

    <!-- Selección de tipo de cliente con checkboxes -->
    <div class="client-type-selection">
      <label>
        <input type="checkbox" v-model="isGuestSelected" @change="toggleClientType('guest')" />
        Particular
      </label>
      <label>
        <input type="checkbox" v-model="isCorporateSelected" @change="toggleClientType('corporate')" />
        Empresa/Agencia
      </label>
    </div>

    <!-- Formulario dinámico -->
    <form @submit.prevent="createClient" class="client-form">
      
      <!-- Formulario para huésped -->
      <div v-if="isGuestSelected" class="guest-card">
        <h2>Añadir Particular</h2>

        <div class="form-grid">
          <div class="form-column">
            <label for="numeroDocumento">Número de Documento:</label>
            <input type="text" v-model="guest.numeroDocumento" required />

            <label for="tipoDocumento">Tipo de Documento:</label>
            <select v-model="guest.tipoDocumento" required>
              <option value="DNI">DNI</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>

            <label for="nombre">Nombre:</label>
            <input type="text" v-model="guest.nombre" required />

            <label for="apellidos">Apellidos:</label>
            <input type="text" v-model="guest.apellidos" required />

            <label for="fechaNacimiento">Fecha de Nacimiento:</label>
            <input type="date" v-model="guest.fechaNacimiento" required />

            <label for="fechaEmision">Fecha de Emisión:</label>
            <input type="date" v-model="guest.fechaEmision" required />
          </div>

          <div class="form-column">
            <label for="fechaCaducidad">Fecha de Caducidad:</label>
            <input type="date" v-model="guest.fechaCaducidad" required />

            <label for="nacionalidad">Nacionalidad:</label>
            <input type="text" v-model="guest.nacionalidad" required />

            <label for="direccion">Dirección:</label>
            <input type="text" v-model="guest.direccion" required />

            <label for="hijoDe">Hijo/a de:</label>
            <input type="text" v-model="guest.hijoDe" />

            <label for="lugarNacimiento">Lugar de Nacimiento:</label>
            <input type="text" v-model="guest.lugarNacimiento" required />

            <label for="sexo">Sexo:</label>
            <select v-model="guest.sexo" required>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Formulario para empresa/agencia -->
      <div v-if="isCorporateSelected" class="corporate-card">
        <h2>Añadir Empresa/Agencia</h2>

        <label for="NIF">NIF:</label>
        <input type="text" v-model="corporate.NIF" required />

        <label for="razonSocial">Razón Social:</label>
        <input type="text" v-model="corporate.razonSocial" required />

        <label for="nombreComercial">Nombre Comercial:</label>
        <input type="text" v-model="corporate.nombreComercial" required />

        <label for="direccionFiscal">Dirección Fiscal:</label>
        <input type="text" v-model="corporate.direccionFiscal" required />

        <label for="codigoPostal">Código Postal:</label>
        <input type="text" v-model="corporate.codigoPostal" required />
      </div>

      <!-- Botones -->
      <div class="button-group">
        <button type="submit" class="btn-submit">Guardar</button>
        <button type="button" @click="resetForm" class="btn-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</template>

<script>
import HeaderComponent from '../Header/HeaderComponent.vue';

export default {
  name: "CreateClient",
  components: {
    HeaderComponent,
  },
  data() {
    return {
      isGuestSelected: true,
      isCorporateSelected: false,
      guest: {
        numeroDocumento: "",
        tipoDocumento: "",
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
      },
      corporate: {
        NIF: "",
        razonSocial: "",
        nombreComercial: "",
        direccionFiscal: "",
        codigoPostal: "",
      },
    };
  },
  methods: {
    toggleClientType(type) {
      if (type === "guest") {
        this.isCorporateSelected = false;
      } else {
        this.isGuestSelected = false;
      }
    },
    resetForm() {
      this.guest = {
        numeroDocumento: "",
        tipoDocumento: "",
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
      };
      this.corporate = {
        NIF: "",
        razonSocial: "",
        nombreComercial: "",
        direccionFiscal: "",
        codigoPostal: "",
      };
      this.$router.go(-1)
    },
    async createClient() {
      const endpoint =
        this.isGuestSelected
          ? "http://localhost:3000/clients/addGuest"
          : "http://localhost:3000/clients/addCorporate";

      const data =
        this.isGuestSelected ? this.guest : this.corporate;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Error al añadir el cliente");

        alert("Cliente añadido correctamente.");
        this.resetForm();
        this.$router.go(-1);
      } catch (error) {
        console.error("Error al guardar el cliente:", error);
        alert("Error al guardar el cliente.");
      }
    },
  },
};
</script>

<style scoped>
.create-client-container {
  background-color: #f5f5f5;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  border-radius: 8px;
}

.client-type-selection {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.client-type-selection label {
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.client-form {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

input, select {
  width: 90%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 5px;
}

.button-group {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.btn-submit {
  margin-top: 10px;
  margin-right: 5px;
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

.btn-submit:hover {
  background-color: #2179b8;
}

.btn-cancel {
  margin-top: 10px;
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

.corporate-card h2 {
  color: #333;
  margin-bottom: 15px;
  font-size: 20px;
  text-align: center;
}

.corporate-card label {
  font-size: 16px;
  color: #333;
  display: block;
  margin-bottom: 5px;
}

.corporate-card input {
  width: 90%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 15px;
}

.corporate-card .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

</style>

<template>
  <HeaderComponent />
  <div class="client-container">
    <h1>Gestión de Clientes</h1>

    <!-- Filtros por tipo de cliente -->
    <div class="filter-container">
      <label class="filter-label">
        <input type="checkbox" v-model="filters.personal" @change="applyFilters" />
        Mostrar Huéspedes
      </label>
      <label class="filter-label">
        <input type="checkbox" v-model="filters.corporate" @change="applyFilters" />
        Mostrar Empresas/Agencias
      </label>
    </div>

    <!-- Buscador -->
    <div class="search-container">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar cliente"
        class="search-input"
        @input="applyFilters"
      />
    </div>

    <div class="button-container">
      <button @click="addClient" class="btn-add">+ Crear Cliente</button>
    </div>

    <!-- Tabla de Huéspedes -->
    <div v-if="filters.personal && filteredGuests.length">
      <h2>Huéspedes</h2>
      <table>
        <thead>
          <tr>
            <th>Documento</th>
            <th>Tipo</th>
            <th>Nombre</th>
            <th>Apellidos</th>
            <th>Nacionalidad</th>
            <th>Dirección</th>
            <th>Sexo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="guest in filteredGuests" :key="guest.numeroDocumento" :class="{ 'editing-row': isEditing(guest) }">
            <td>{{ guest.numeroDocumento }}</td>

            <td v-if="isEditing(guest)">
              <select v-model="editableClient.tipoDocumento" class="editable-select">
                <option value="DNI">DNI</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </td>
            <td v-else>{{ guest.tipoDocumento }}</td>

            <td v-if="isEditing(guest)">
              <input type="text" v-model="editableClient.nombre" class="editable-input" />
            </td>
            <td v-else>{{ guest.nombre }}</td>

            <td v-if="isEditing(guest)">
              <input type="text" v-model="editableClient.apellidos" class="editable-input" />
            </td>
            <td v-else>{{ guest.apellidos }}</td>

            <td v-if="isEditing(guest)">
              <input type="text" v-model="editableClient.nacionalidad" class="editable-input" />
            </td>
            <td v-else>{{ guest.nacionalidad }}</td>

            <td v-if="isEditing(guest)">
              <input type="text" v-model="editableClient.direccion" class="editable-input" />
            </td>
            <td v-else>{{ guest.direccion }}</td>

            <td v-if="isEditing(guest)">
              <select v-model="editableClient.sexo" class="editable-select">
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </td>
            <td v-else>{{ guest.sexo }}</td>

            <td class="actions">
              <i class="bx" 
                :class="isEditing(guest) ? 'bxs-save save-icon' : 'bxs-edit-alt edit-icon'" 
                @click="toggleEditParticular(guest)"
                :title="isEditing(guest) ? 'Guardar' : 'Modificar'"
              ></i>
              <i v-if="isEditing(guest)" 
                class="bx bx-x-circle cancel-icon" 
                @click="cancelEdit" 
                title="Cancelar"
              ></i>
              <i 
                v-else 
                class="bx bx-search"
                @click="showParticular(guest.numeroDocumento)" 
                title="Ver más" 
                style="cursor: pointer; color:#4caf50"
              ></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tabla de Empresas/Agencias -->
    <div v-if="filters.corporate && filteredCorporateClients.length">
      <h2>Empresas/Agencias</h2>
      <table>
        <thead>
          <tr>
            <th>NIF</th>
            <th>Razón Social</th>
            <th>Nombre Comercial</th>
            <th>Dirección Fiscal</th>
            <th>Código Postal</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in filteredCorporateClients" :key="client.NIF" :class="{ 'editing-row': isEditing(client) }">
            <td>{{ client.NIF }}</td>

            <td v-if="isEditing(client)">
              <input type="text" v-model="editableClient.razonSocial" class="editable-input" />
            </td>
            <td v-else>{{ client.razonSocial }}</td>

            <td v-if="isEditing(client)">
              <input type="text" v-model="editableClient.nombreComercial" class="editable-input" />
            </td>
            <td v-else>{{ client.nombreComercial }}</td>

            <td v-if="isEditing(client)">
              <input type="text" v-model="editableClient.direccionFiscal" class="editable-input" />
            </td>
            <td v-else>{{ client.direccionFiscal }}</td>

            <td v-if="isEditing(client)">
              <input type="text" v-model="editableClient.codigoPostal" class="editable-input" />
            </td>
            <td v-else>{{ client.codigoPostal }}</td>

            <td class="actions">
              <i class="bx" 
                :class="isEditing(client) ? 'bxs-save save-icon' : 'bxs-edit-alt edit-icon'" 
                @click="toggleEditCompany(client)"
                :title="isEditing(client) ? 'Guardar' : 'Modificar'"
              ></i>
              <i v-if="isEditing(client)" 
                class="bx bx-x-circle cancel-icon" 
                @click="cancelEdit" 
                title="Cancelar"
              ></i>
              <i 
                v-else 
                class="bx bx-search"
                @click="showCompany(client.NIF)" 
                title="Ver más" 
                style="cursor: pointer; color:#4caf50"
              ></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import HeaderComponent from '../Header/HeaderComponent.vue';
import { inject, onMounted, onUnmounted, ref, computed } from "vue";

export default {
  name: "ClientComponent",
  components: { HeaderComponent },

  setup() {
    const socket = inject("socket").getInstance();

    // Datos reactivos
    const guests = ref([]);
    const corporateClients = ref([]);
    const searchQuery = ref("");
    const filters = ref({
      personal: true,
      corporate: true,
    });

    const fetchClients = async () => {
      try {
        const guestsResponse = await fetch("http://localhost:3000/clients/guests");
        guests.value = await guestsResponse.json();

        const corporateResponse = await fetch("http://localhost:3000/clients/corporate");
        corporateClients.value = await corporateResponse.json();
      } catch (error) {
        console.error("Error al obtener los datos:", error);
      }
    };

    // Filtrar huéspedes
    const filteredGuests = computed(() => {
      if (!filters.value.personal) return [];

      return guests.value.filter(guest => {
        const query = searchQuery.value.toLowerCase();
        return (
          guest.numeroDocumento.toLowerCase().includes(query) ||
          guest.tipoDocumento.toLowerCase().includes(query) ||
          guest.nombre.toLowerCase().includes(query) ||
          guest.apellidos.toLowerCase().includes(query) ||
          guest.nacionalidad.toLowerCase().includes(query) ||
          guest.direccion.toLowerCase().includes(query)
        );
      });
    });

    // Filtrar clientes corporativos
    const filteredCorporateClients = computed(() => {
      if (!filters.value.corporate) return [];

      return corporateClients.value.filter(client => {
        const query = searchQuery.value.toLowerCase();
        return (
          client.NIF.toLowerCase().includes(query) ||
          client.razonSocial.toLowerCase().includes(query) ||
          client.nombreComercial.toLowerCase().includes(query) ||
          client.direccionFiscal.toLowerCase().includes(query) ||
          client.codigoPostal.toLowerCase().includes(query)
        );
      });
    });

    // Cargar datos y escuchar eventos de sockets
    onMounted(() => {
      fetchClients();
      socket.on("actualizarHuespedes", fetchClients);
    });

    onUnmounted(() => {
      socket.off("actualizarHuespedes", fetchClients);
    });

    return {
      guests,
      corporateClients,
      fetchClients,
      searchQuery,
      filters,
      filteredGuests,
      filteredCorporateClients
    };
  },
  data() {
    return {
      editingId: null,
      editableClient: {}
    };
  },
  created() {
    this.fetchClients();
  },
  methods: {
    applyFilters() {
      const query = this.searchQuery?.toLowerCase() || "";

      this.filteredGuests = (this.guests?.value ?? []).filter(
        (guest) =>
          guest.numeroDocumento?.toLowerCase().includes(query) ||
          guest.tipoDocumento?.toLowerCase().includes(query) ||
          guest.nombre?.toLowerCase().includes(query) ||
          guest.apellidos?.toLowerCase().includes(query) ||
          guest.nacionalidad?.toLowerCase().includes(query) ||
          guest.direccion?.toLowerCase().includes(query)
      );

      this.filteredCorporateClients = (this.corporateClients ?? []).filter(
        (client) =>
          client.NIF?.toLowerCase().includes(query) ||
          client.razonSocial?.toLowerCase().includes(query) ||
          client.nombreComercial?.toLowerCase().includes(query) ||
          client.direccionFiscal?.toLowerCase().includes(query) ||
          client.codigoPostal?.toLowerCase().includes(query)
      );
    },

    isEditing(client) {
      return this.editingId === client.NIF || this.editingId === client.numeroDocumento;
    },
    toggleEditParticular(client) {
      if (this.isEditing(client)) {
        this.updateParticular();
      } else {
        this.editingId = client.numeroDocumento;
        this.editableClient = { ...client };
      }
    },
    toggleEditCompany(client) {
      if (this.isEditing(client)) {
        this.updateCompany();
      } else {
        this.editingId = client.NIF;
        this.editableClient = { ...client };
      }
    },
    addClient() {
      this.$router.push(`/addClient`);
    },
    async updateParticular() {
      try {
        await fetch(`http://localhost:3000/clients/updateParticular`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.editableClient)
        });
        this.editingId = null;
        this.fetchClients();
      } catch (error) {
        console.error("Error al actualizar el cliente:", error);
      }
    },
    async updateCompany() {
      try {
        await fetch(`http://localhost:3000/clients/updateCompany`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.editableClient)
        });
        this.editingId = null;
        this.fetchClients();
      } catch (error) {
        console.error("Error al actualizar el cliente:", error);
      }
    },
    cancelEdit() {
      this.editingId = null;
    },
    showParticular(numeroDocumento){
      this.$router.push(`/guest/${numeroDocumento}`)
    },
    showCompany(NIF){
      this.$router.push(`/client/${NIF}`)
    }
  }
};
</script>


<style scoped>
/* Añade aquí el estilo que compartiste para mantener consistencia */
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

.client-container {
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #171a20;
  margin-bottom: 20px;
}

.tabs-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  gap: 20px;
}

.tab {
  padding: 10px 20px;
  font-size: 16px;
  font-weight: bold;
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab.active {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
}

.tab:hover {
  background-color: #0056b3;
  color: white;
}

.search-container {
  width: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-input {
  padding: 10px;
  width: 95%;
  border: 1px solid #ddd;
  border-radius: 8px;
}

table {
  width: 1200px;
  border-collapse: collapse;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: 20px;
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

.button-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
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
  transition: background-color 0.3s ease;
}

.btn-add:hover {
  background-color: #0056b3;
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

.modal-content input {
  margin-bottom: 15px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.modal-content .button-group {
  display: flex;
  justify-content: space-between;
}

.modal-content .button-group button {
  flex: 1;
  margin: 0 5px;
}

.btn-save {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-save:hover {
  background-color: #218838;
}

.btn-cancel {
  background-color: #f9f9f9;
  color: #333;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s ease-in-out;
}

.btn-cancel:hover {
  background-color: #e9e9e9;
}

.actions i {
  font-size: 20px;
  transition: color 0.3s ease;
  padding: 4px 10px;
  cursor: pointer;
}

.actions i:hover {
  color: #171a20;
}

</style>

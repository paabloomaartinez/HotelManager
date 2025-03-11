<template>
    <HeaderComponent />
    <div class="client-container">
      <h1>Gestión de la Factura</h1>
      <p>Selecciona un cliente para generar la factura.</p>
  
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
            </tr>
          </thead>
          <tbody>
            <tr v-for="guest in filteredGuests" :key="guest.numeroDocumento" @click="processCheckOut(this.idReserva, guest)" style="cursor: pointer;">
              <td>{{ guest.numeroDocumento }}</td>
              <td>{{ guest.tipoDocumento }}</td>
              <td>{{ guest.nombre }}</td>
              <td>{{ guest.apellidos }}</td>
              <td>{{ guest.nacionalidad }}</td>
              <td>{{ guest.direccion }}</td>
              <td>{{ guest.sexo }}</td>
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
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in filteredCorporateClients" :key="client.NIF" @click="processCheckOut(this.idReserva, client)" style="cursor: pointer;">
              <td>{{ client.NIF }}</td>
              <td>{{ client.razonSocial }}</td>
              <td>{{ client.nombreComercial }}</td>
              <td>{{ client.direccionFiscal }}</td>
              <td>{{ client.codigoPostal }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>
  
  <script>
  import HeaderComponent from '../Header/HeaderComponent.vue';
  
  export default {
    name: "CheckOutFormComponent",
    components: {
      HeaderComponent,
    },
    data() {
      return {
        idReserva: null,
        guests: [],
        corporateClients: [],
        filteredGuests: [],
        filteredCorporateClients: [],
        searchQuery: "",
        filters: {
          personal: true,
          corporate: true,
        },
      };
    },
    created() {
      this.fetchClients();
    },
    methods: {
        async fetchClients() {
            try {
            this.idReserva = this.$route.params.idReserva;

            const guestsResponse = await fetch(`http://localhost:3000/clients/guests/${this.idReserva}`);
            this.guests = await guestsResponse.json();
    
            const corporateResponse = await fetch("http://localhost:3000/clients/corporate");
            this.corporateClients = await corporateResponse.json();
    
            this.applyFilters();
            } catch (error) {
            console.error("Error al obtener los datos:", error);
            }
        },
        applyFilters() {
            const query = this.searchQuery.toLowerCase();
    
            this.filteredGuests = this.guests.filter(
            (guest) =>
                guest.numeroDocumento.toLowerCase().includes(query) ||
                guest.tipoDocumento.toLowerCase().includes(query) ||
                guest.nombre.toLowerCase().includes(query) ||
                guest.apellidos.toLowerCase().includes(query) ||
                guest.nacionalidad.toLowerCase().includes(query) ||
                guest.direccion.toLowerCase().includes(query)
            );
    
            this.filteredCorporateClients = this.corporateClients.filter(
            (client) =>
                client.NIF.toLowerCase().includes(query) ||
                client.razonSocial.toLowerCase().includes(query) ||
                client.nombreComercial.toLowerCase().includes(query) ||
                client.direccionFiscal.toLowerCase().includes(query) ||
                client.codigoPostal.toLowerCase().includes(query)
            );
        },
        async processCheckOut(idReserva, client) {
            let clientData = {};

            // Verificar si el cliente es un huésped (particular) o una empresa/agencia
            if (client.numeroDocumento) {
                // Cliente particular
                clientData = {
                    tipo: "particular",
                    identificador: client.numeroDocumento,
                    nombre: client.nombre,
                    apellidos: client.apellidos,
                    direccion: client.direccion,
                    nacionalidad: client.nacionalidad,
                    lugarNacimiento: client.lugarNacimiento,
                    provincia: "Guipúzcoa",
                    codigoPostal: 20304
                };
            } else if (client.NIF) {
                // Cliente empresa/agencia
                clientData = {
                    tipo: "empresa",
                    identificador: client.NIF,
                    razonSocial: client.razonSocial,
                    nombreComercial: client.nombreComercial,
                    direccion: client.direccionFiscal,
                    codigoPostal: client.codigoPostal
                };
            } else {
                alert("Error: Cliente inválido.");
                return;
            }

            // Confirmación antes de proceder
            if (!confirm(`¿Quieres crear la factura a nombre de ${clientData.nombre || clientData.razonSocial}?`)) {
                return;
            }

            try {
                const response = await fetch("http://localhost:3000/reservations/processCheckOut", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ idReserva, clientData }),
                });

                if (!response.ok) throw new Error("Error al procesar el check-out");

                const result = await response.json();
                alert(result.message);

                this.$router.push("/reception/checkout");
            } catch (error) {
                console.error("Error al procesar el check-out:", error);
                alert("Error al procesar el check-out.");
            }
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
  
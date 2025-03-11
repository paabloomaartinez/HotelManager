<template>
  <HeaderComponent/>
  <div class="admin-reports">
    <div class="report-container">
      <h2>Generar Informe</h2>
      <div class="form-group">
        <select v-model="selectedReport">
          <option disabled value="">Selecciona un informe</option>
          <option value="lista-policia">Lista de Policía</option>
          <option value="lista-ocupacion">Lista de Ocupación</option>
          <option value="checkins-hoy">Check-ins de Hoy</option>
          <option value="checkouts-hoy">Check-outs de Hoy</option>
          <option value="reservas">Informe de Ocupación</option>
        </select>
      </div>
      <button @click="downloadReport" :disabled="!selectedReport">Descargar PDF</button>
    </div>
  </div>
</template>

<script>
import HeaderComponent from '../Header/HeaderComponent.vue';

export default {
  name: "AdminReports",
  components: {
    HeaderComponent
  },
  data() {
    return {
      selectedReport: "",
    };
  },
  methods: {
    async downloadReport() {
      if (!this.selectedReport) {
        alert("Selecciona un informe");
        return;
      }

      let endpoint = `/${this.selectedReport}`;

      try {
        const response = await fetch(`http://localhost:3000${endpoint}`);
        if (!response.ok) throw new Error("No se encontraron datos.");

        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `${this.selectedReport}.pdf`;
        link.click();
      } catch (error) {
        console.error("Error al descargar el informe:", error);
      }
    }
  }
};
</script>

<style scoped>
/* Contenedor principal */
.admin-reports {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f4f4f9;
}

/* Caja del formulario */
.report-container {
  background: #ffffff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 350px;
}

/* Título */
h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 20px;
}

/* Grupo del formulario */
.form-group {
  margin-bottom: 20px;
}

/* Estilo del select */
select {
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
  cursor: pointer;
  transition: border 0.3s ease;
}

select:focus {
  border-color: #007bff;
  outline: none;
}

/* Estilo del botón */
button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

button:hover {
  background: linear-gradient(to right, #0056b3, #004494);
}

button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}
</style>

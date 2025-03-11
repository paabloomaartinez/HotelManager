<template>
  <div class="admin-dashboard">
    <h2>Panel de Administrador</h2>

    <div class="dashboard-grid">

      <!-- Card para gestionar empleados -->
      <div class="card" @click="manageEmployees">
        <i class="bx bxs-user-detail card-icon"></i>
        <h3>Gestionar Empleados</h3>
        <p>Ver, añadir y modificar la información de los empleados.</p>
      </div>

      <!-- Nuevo Card para generar informes -->
      <div class="card" @click="manageReports">
        <i class="bx bxs-report card-icon"></i>
        <h3>Generar Informes</h3>
        <p>Accede a los reportes detallados sobre el estado del hotel.</p>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: "AdminDashboardComponent",
  methods: {
    manageEmployees() {
      this.$router.push('/admin/employee');
    },
    manageReports() {
      this.$router.push('/admin/reports');
    },
    manageRates() {
      this.$router.push('/admin/rates');
    },
    moreFeatures() {
      alert('Esta funcionalidad está en construcción. ¡Pronto habrá más!');
    }
  }
};
</script>

<style scoped>
.admin-dashboard {
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

h2 {
  font-size: 32px;
  color: #333;
  margin-bottom: 30px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

/* Card styling */
.card {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.card-icon {
  font-size: 48px;
  color: #3498db;
  margin-bottom: 20px;
}

h3 {
  font-size: 24px;
  color: #444;
}

p {
  font-size: 16px;
  color: #666;
}
</style>
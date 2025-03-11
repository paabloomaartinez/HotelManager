<template>
  <div class="reception-dashboard">
    <h2>Panel de Recepcionista</h2>

    <div class="dashboard-grid">
      <!-- Primera columna -->
      <div class="column">
        <!-- Card para gestionar reservas -->
        <div class="card" @click="manageReservations">
          <i class="bx bxs-calendar card-icon"></i>
          <h3>Gestionar Reservas</h3>
          <p>Ver, crear y modificar reservas realizadas por los clientes.</p>
        </div>

        <!-- Card para gestionar clientes -->
        <div class="card" @click="manageClients">
          <i class="bx bxs-user-circle card-icon"></i>
          <h3>Gestionar Clientes</h3>
          <p>Consultar y actualizar la información de los clientes.</p>
        </div>
      </div>

      <!-- Segunda columna -->
      <div class="column">
        <!-- Card para gestionar check-in/check-out -->
        <div class="card" @click="manageCheckInOut">
          <i class="bx bxs-check-circle card-icon"></i>
          <h3>Check-in / Check-out</h3>
          <p>Gestionar las entradas y salidas de los clientes.</p>
        </div>

        <!-- Card para gestionar habitaciones -->
        <div class="card" @click="manageRooms">
          <i class="bx bxs-hotel card-icon"></i>
          <h3>Gestionar Habitaciones</h3>
          <p>Ver y modificar el estado de las habitaciones.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ReceptionDashboardComponent",
  methods: {
    manageReservations() {
      this.$router.push('/reception/reservations');
    },
    manageClients() {
      this.$router.push('/reception/clients');
    },
    manageCheckInOut() {
      this.$router.push('/reception/checkincheckout');
    },
    manageRooms() {
      this.$router.push('/rooms');
    },
  },
};
</script>

<style scoped>
.reception-dashboard {
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
  display: flex;
  gap: 20px;
  justify-content: center;
}

.column {
  display: flex;
  flex-direction: column;
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
  align-items: start;
  width: 400px; /* Establecer un ancho fijo para uniformidad */
  height: 200px; /* Establecer una altura fija para uniformidad */
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.card-icon {
  font-size: 48px;
  color: #3498db;
  margin-bottom: 10px;
}

h3 {
  font-size: 20px;
  color: #444;
  text-align: center;
}

p {
  font-size: 16px;
  color: #666;
}
</style>

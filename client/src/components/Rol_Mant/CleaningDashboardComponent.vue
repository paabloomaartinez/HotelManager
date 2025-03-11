<template>
    <div class="cleaning-dashboard">
      <h2>Panel de Limpieza / Mantenimiento</h2>
  
      <div class="dashboard-grid">
        <!-- Primera columna -->
        <div class="column">
          <!-- Card para limpieza diaria -->
          <div class="card" @click="dailyCleaning">
            <i class="bx bxs-door-open card-icon"></i>
            <h3>Limpieza Diaria</h3>
            <p>Gestionar la limpieza diaria de las habitaciones.</p>
          </div>
        </div>
  
        <!-- Segunda columna -->
        <div class="column">
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
    name: "CleaningDashboardComponent",
    methods: {
      dailyCleaning() {
        this.$router.push('/cleaning/daily-cleaning'); // Ruta para gestionar limpieza diaria
      },
      manageRooms() {
      this.$router.push('/rooms');
    },
    },
  };
  </script>
  
  <style scoped>
  .cleaning-dashboard {
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
        flex-direction: column; /* Apilar los elementos verticalmente */
        gap: 20px;
        justify-content: center;
        align-items: center; /* Centrar las tarjetas en el eje horizontal */
    }

    .column {
        width: 100%; /* Ajustar el ancho para que las tarjetas ocupen el espacio disponible */
        display: flex;
        flex-direction: column;
        align-items: center; /* Centrar las tarjetas dentro de la columna */
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

  /* Media query para pantallas pequeñas */
@media (max-width: 768px) {
  h2 {
    font-size: 20px;
  }

  .card {
    height: 150px; /* Reducir la altura para pantallas más pequeñas */
  }

  .card-icon {
    font-size: 36px; /* Reducir el tamaño del icono */
  }

  h3 {
    font-size: 16px;
  }

  p {
    font-size: 12px;
  }
}

/* Media query para pantallas muy pequeñas (como teléfonos antiguos) */
@media (max-width: 480px) {
  .card {
    padding: 15px; /* Reducir el padding */
    height: auto; /* Dejar que la altura se ajuste automáticamente */
  }

  .card-icon {
    font-size: 32px; /* Ajustar el tamaño del icono */
  }
}
  </style>
  
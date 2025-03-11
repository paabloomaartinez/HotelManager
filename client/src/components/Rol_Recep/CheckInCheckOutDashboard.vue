<template>
    <HeaderComponent />
    <div class="cleaning-dashboard">
      <h2>Gestión de Check-ins y Check-outs</h2>
      <div class="dashboard-grid">
        <!-- Card para Check-ins -->
        <div class="card" @click="goToCheckIns">
          <div class="card-header">
            <i class="card-icon bx bx-log-in"></i>
            <h3>Check-ins</h3>
          </div>
          <div class="card-content">
            <p><strong>Total:</strong> {{ checkInData.total }}</p>
            <p><strong>Realizados:</strong> {{ checkInData.completed }}</p>
            <p><strong>Pendientes:</strong> {{ checkInData.pending }}</p>
          </div>
        </div>
  
        <!-- Card para Check-outs -->
        <div class="card" @click="goToCheckOuts">
          <div class="card-header">
            <i class="card-icon bx bx-log-out"></i>
            <h3>Check-outs</h3>
          </div>
          <div class="card-content">
            <p><strong>Total:</strong> {{ checkOutData.total }}</p>
            <p><strong>Realizados:</strong> {{ checkOutData.completed }}</p>
            <p><strong>Pendientes:</strong> {{ checkOutData.pending }}</p>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
import HeaderComponent from '../Header/HeaderComponent.vue';
  
  export default {
    name: "CheckInOutDashboard",
    components: {
      HeaderComponent,
    },
    data() {
      return {
        checkInData: { total: 0, completed: 0, pending: 0 },
        checkOutData: { total: 0, completed: 0, pending: 0 },
      };
    },
    created() {
      this.fetchCheckInSummary();
      this.fetchCheckOutSummary();
    },
    methods: {
      async fetchCheckInSummary() {
        try {
          const response = await fetch("http://localhost:3000/checkins/summary");
          if (!response.ok) throw new Error("Error al obtener el resumen de check-ins");
          this.checkInData = await response.json();
          console.log(this.checkInData)
        } catch (error) {
          console.error("Error al obtener el resumen de check-ins:", error);
        }
      },
      async fetchCheckOutSummary() {
        try {
          const response = await fetch("http://localhost:3000/checkouts/summary");
          if (!response.ok) throw new Error("Error al obtener el resumen de check-outs");
          this.checkOutData = await response.json();
          console.log(this.checkOutData)
        } catch (error) {
          console.error("Error al obtener el resumen de check-outs:", error);
        }
      },
      goToCheckIns() {
        this.$router.push("/reception/checkin");
      },
      goToCheckOuts() {
        this.$router.push("/reception/checkout");
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
    flex-direction: column;
    gap: 20px;
    justify-content: center;
    align-items: center;
  }
  
  .column {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
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
    display: flex;
    flex-direction: column;
    width: 400px;
    height: auto;
  }
  
  .card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
  }
  
  /* Card header styling */
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px; /* Espaciado entre el icono y el título */
    margin-bottom: 10px;
  }
  
  .card-icon {
    font-size: 48px;
    color: #3498db;
  }
  
  .card-header h3 {
    font-size: 20px;
    color: #444;
    margin: 0;
  }
  
  /* Card content styling */
  .card-content {
    gap: 5px;
  }
  
  .card-content p {
    font-size: 16px;
    color: #666;
  }
  
  /* Media query para pantallas pequeñas */
  @media (max-width: 768px) {
    h2 {
      font-size: 20px;
    }
  
    .card {
      width: 90%;
    }
  
    .card-icon {
      font-size: 36px;
    }
  
    .card-header h3 {
      font-size: 18px;
    }
  
    .card-content p {
      font-size: 14px;
    }
  }
  
  /* Media query para pantallas muy pequeñas */
  @media (max-width: 480px) {
    .card {
      padding: 15px;
    }
  
    .card-icon {
      font-size: 32px;
    }
  
    .card-header h3 {
      font-size: 16px;
    }
  
    .card-content p {
      font-size: 12px;
    }
  }
  </style>
  
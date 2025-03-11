<template>
    <HeaderComponent />
    <div class="company-details-container">
      <h1>Detalles de la Empresa/Agencia</h1>
  
      <!-- Información de la empresa/agencia -->
      <div class="company-info">
        <h2>Información de la Empresa</h2>
        <p><strong>NIF:</strong> {{ company.NIF }}</p>
        <p><strong>Razón Social:</strong> {{ company.razonSocial }}</p>
        <p><strong>Nombre Comercial:</strong> {{ company.nombreComercial }}</p>
        <p><strong>Dirección Fiscal:</strong> {{ company.direccionFiscal }}</p>
        <p><strong>Código Postal:</strong> {{ company.codigoPostal }}</p>
      </div>
  
      <!-- Botón Volver Atrás -->
      <div class="button-container">
        <button @click="goBack" class="btn-back">Volver Atrás</button>
      </div>
    </div>
  </template>
  
  <script>
  import { inject, onMounted, onUnmounted, ref } from "vue";
import HeaderComponent from "../Header/HeaderComponent.vue";
import { useRoute } from "vue-router";

export default {
  name: "CompanyDetails",
  components: { HeaderComponent },

  setup() {
    const socket = inject("socket").getInstance(); // Instancia de Socket.io
    const company = ref({}); // Información de la empresa
    const route = useRoute(); // Obtiene los parámetros de la ruta

    const fetchCompanyDetails = async () => {
      const NIF = route.params.NIF;
      try {
        const response = await fetch(`http://localhost:3000/corporate/details/${NIF}`);
        company.value = await response.json();
      } catch (error) {
        console.error("Error al obtener los detalles de la empresa:", error);
      }
    };

    onMounted(() => {
      fetchCompanyDetails();

      // 🔴 Escuchar el evento de actualización de empresas/agencias
      socket.on("actualizarHuespedes", () => {
        console.log("📢 Actualizando detalles de la empresa...");
        fetchCompanyDetails();
      });
    });

    onUnmounted(() => {
      // 🔴 Desuscribirse del evento cuando el componente se desmonta
      socket.off("actualizarHuespedes");
    });

    return { company, fetchCompanyDetails };
  },
    data() {
      return {
        reservations: [], // Historial de reservas
      };
    },
    created() {
      this.fetchCompanyDetails();
    },
    methods: {
      formatDate(date) {
        const options = { day: "2-digit", month: "2-digit", year: "numeric" };
        return new Date(date).toLocaleDateString("es-ES", options);
      },
      goBack() {
        this.$router.go(-1); // Vuelve a la página anterior
      },
    },
  };
  </script>
  
  <style scoped>
  .company-details-container {
    background-color: #f5f5f5;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .company-info {
    background-color: #ffffff;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 10px;
  }
  
  h2 {
    color: #333;
    margin-bottom: 10px;
    border-bottom: 2px solid #3498db;
    padding-bottom: 5px;
  }
  
  /* Estilos para el botón Volver Atrás */
  .button-container {
    display: flex;
    justify-content: center;
    margin-top: 10px;
  }
  
  .btn-back {
    color: #fff;
    padding: 12px 20px;
    font-size: 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    transition: background-color 0.2s ease-in-out;
    background-color: #6c757d;
  }
  
  .btn-back:hover {
    background-color: #5a6268;
  }
  </style>
  
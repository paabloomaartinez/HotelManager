<template>
  <HeaderComponent />
  <main>
    <div class="home-container">
      <div class="main-content">
        <!-- Condicional según el rol del usuario -->
        <div class="dashboard-container">
          <div v-if="userRole === 'Administrador' && tempUser === null">
            <AdminDashboardComponent />
          </div>

          <div v-else-if="userRole === 'Recepcionista' || tempUser === 'Recepcionista'">
            <ReceptionDashboardComponent />
          </div>

          <div v-else-if="userRole === 'LimpiezaYMantenimiento' || tempUser === 'LimpiezaYMantenimiento'">
            <CleaningDashboardComponent />
          </div>

          <div v-else>
            <div class="general-section">
              <h2>Sección General</h2>
              <p>Contenido general para cualquier otro usuario.</p>
            </div>
          </div>
        </div>
        <!-- Chat Component -->
        <div class="chat-container">
          <ChatComponent />
        </div>
      </div>
    </div>
  </main>
</template>

<script>
import { jwtDecode } from "jwt-decode";
import HeaderComponent from "./Header/HeaderComponent.vue";
import AdminDashboardComponent from "./Rol_Admin/AdminDashboardComponent.vue";
import ReceptionDashboardComponent from "./Rol_Recep/ReceptionDashboardComponent.vue";
import CleaningDashboardComponent from "./Rol_Mant/CleaningDashboardComponent.vue";
import ChatComponent from "./ChatComponent.vue";

export default {
  name: "HomeComponent",
  components: {
    HeaderComponent,
    AdminDashboardComponent,
    ReceptionDashboardComponent,
    CleaningDashboardComponent,
    ChatComponent
  },
  data() {
    return {
      userRole: null,
      tempUser: null,
    };
  },
  created() {
    // Obtener el token del sessionStorage
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        // Decodificar el token para obtener el rol del usuario
        const decodedToken = jwtDecode(token);
        this.userRole = decodedToken.rol; // El campo depende de cómo se guarda en el token
      } catch (error) {
        console.error("Error al decodificar el token:", error);
      }
    }
    const tempToken = sessionStorage.getItem('tempToken');
    if (tempToken) {
      try {
        const decodedToken = jwtDecode(tempToken);
        this.tempUser = decodedToken.rol;
      } catch (error) {
        console.error("Error al decodificar el token:", error);
      }
    }
  },
};
</script>

<style scoped>
/* General container */
.home-container {
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  margin-top: 20px;
}

/* Contenedor principal del contenido y el chat */
.main-content {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* Contenedor de los dashboards */
.dashboard-container {
  flex: 3; /* Ocupa más espacio que el chat */
  padding: 16px;
  min-height: 300px; /* Asegura un tamaño mínimo */
}

/* Contenedor del chat */
.chat-container {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  height: fit-content; /* Ajusta la altura automáticamente al contenido */
}

/* Scrollbar personalización */
.dashboard-container::-webkit-scrollbar,
.chat-container::-webkit-scrollbar {
  width: 8px;
}

.dashboard-container::-webkit-scrollbar-thumb,
.chat-container::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: 4px;
}

.dashboard-container::-webkit-scrollbar-thumb:hover,
.chat-container::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

/* Encabezados y texto */
h1,
h2 {
  text-align: center;
  color: #171a20;
  margin-bottom: 20px;
}

h2 {
  font-size: 24px;
  color: #444;
}

p {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
}

/* Chat specific styles */
.chat-container .chat-messages {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  padding: 8px;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.chat-container .chat-messages .message {
  margin-bottom: 8px;
}

.chat-container .chat-input {
  display: flex;
  gap: 8px;
}

.chat-container .chat-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.chat-container .chat-input button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.chat-container .chat-input button:hover {
  background-color: #0056b3;
}

/* Ajustes responsive */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .dashboard-container,
  .chat-container {
    width: 100%;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 20px;
  }

  p {
    font-size: 14px;
  }
}
</style>

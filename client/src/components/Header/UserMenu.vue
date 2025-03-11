<template>
    <nav class="user-menu-container">
      <i class="bx bx-user-circle" style="color: #171A20;" @click="toggleMenu"></i>
      <div v-if="isMenuVisible" class="dropdown-menu">
        <router-link to="/profile" class="dropdown-item">
          <i class="bx bxs-user-detail" style="color:#171a20"></i>
          Perfil
        </router-link>
        <hr class="dropdown-divider">
        <div @click="logout" class="dropdown-item">
          <i class="bx bx-log-out bx-rotate-180" style="color:#171A20"></i>
          Cerrar sesión
        </div>
      </div>
    </nav>
  </template>
  
  <script>
  import { inject } from "vue";
  import eventBus from "@/eventBus";
  
  export default {
    name: "UserMenu",
    setup() {
      const { getInstance } = inject("socket"); // ✅ Obtener el socket

      return { getInstance };
    },
    data() {
      return {
        isMenuVisible: false,
      };
    },
    methods: {
      toggleMenu() {
        this.isMenuVisible = !this.isMenuVisible;
        if (this.isMenuVisible) {
          document.addEventListener("click", this.handleClickOutside);
        } else {
          document.removeEventListener("click", this.handleClickOutside);
        }
      },
      handleClickOutside(event) {
        const dropdownMenu = this.$el.querySelector(".dropdown-menu");
        const userIcon = this.$el.querySelector(".bx-user-circle");
        if (
          dropdownMenu &&
          !dropdownMenu.contains(event.target) &&
          !userIcon.contains(event.target)
        ) {
          this.isMenuVisible = false;
          document.removeEventListener("click", this.handleClickOutside);
        }
      },
      logout() {
        const socket = this.getInstance(); // ✅ Obtener el socket

        if (socket) {
          console.log("🔌 Desconectando socket...");
          socket.emit("userDisconnected"); // ✅ Informar al servidor
          socket.disconnect(); // ✅ Desconectar del servidor
        } else {
          console.warn("⚠️ No se encontró socket al cerrar sesión.");
        }

        // Eliminar el token y los datos del usuario del sessionStorage
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("tempToken");

        // 🔄 Notificar a los componentes para actualizar la lista de usuarios conectados
        eventBus.emit("userLoggedOut");

        // Redirigir al usuario a la página de inicio de sesión
        this.$router.push("/");
      },
    },
    beforeUnmount() {
      document.removeEventListener("click", this.handleClickOutside);
    },
  };
  </script>
  
  <style scoped>
  .user-menu-container {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex: 1;
  }
  
  .user-menu-container i {
    font-size: 25px;
    cursor: pointer;
    padding-right: 32px;
  }
  
  .dropdown-menu {
    position: absolute;
    right: 25px;
    top: 55px;
    background-color: #fff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    z-index: 10000;
    white-space: nowrap;
    padding: 5px 10px;
    width: auto;
  }
  
  .dropdown-item {
    color: #171A20;
    text-decoration: none;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    padding: 6px 15px;
    box-sizing: border-box;
    cursor: pointer;
  }
  
  .dropdown-item i {
    margin-right: 8px;
    padding: 0;
  }
  
  .dropdown-item:hover {
    background-color: #f0f0f0;
    border-radius: 4px;
  }
  
  .dropdown-divider {
    border: 0;
    height: 1px;
    margin: 8px 0;
    background-color: #e0e0e0; /* Color de la línea */
  }
  </style>
  
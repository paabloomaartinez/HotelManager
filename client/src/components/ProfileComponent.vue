<template>
  <HeaderComponent />
  <div class="profile-container">
    <h2>Perfil del Usuario</h2>
    <div class="profile-details">
      <p><strong>Nombre:</strong> {{ user.nombre }} {{ user.apellidos }}</p>
      <p><strong>Usuario:</strong> {{ user.nombreUsuario }}</p>
      <p><strong>Rol:</strong> {{ user.rol }}</p>
    </div>

    <div class="button-container">
      <button @click="openPasswordModal">Cambiar Contraseña</button>
      <button v-if="userRole === 'Administrador'" @click="openRoleModal">Cambiar Rol</button>
      <button @click="logout" style="background-color: #f44336;">Cerrar Sesión</button>
    </div>

    <!-- Modal para cambiar la contraseña -->
    <div v-if="isPasswordModalOpen" class="modal">
      <div class="modal-content">
        <h3>Cambiar Contraseña</h3>
        <form @submit.prevent="handleChangePassword">
          <div class="input-group">
            <label for="current-password">Contraseña Actual</label>
            <input type="password" id="current-password" v-model="currentPassword" required />
          </div>
          <div class="input-group">
            <label for="new-password">Nueva Contraseña</label>
            <input type="password" id="new-password" v-model="newPassword" required />
          </div>
          <div class="input-group">
            <label for="confirm-password">Confirmar Nueva Contraseña</label>
            <input type="password" id="confirm-password" v-model="confirmPassword" required />
          </div>
          <div class="button-container">
            <button type="submit">Aceptar</button>
            <button type="button" style="background-color: #f44336" @click="closePasswordModal">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para cambiar el rol -->
    <div v-if="isRoleModalOpen" class="modal">
      <div class="modal-content">
        <h3>Cambiar Rol</h3>
        <div class="input-group">
          <label for="select-role">Seleccione el rol que desea:</label>
          <select v-model="selectedRole" id="select-role">
            <option v-for="rol in roles" :key="rol" :value="rol">{{ rol }}</option>
          </select>
        </div>
        <div class="button-container">
          <button @click="changeRole">Confirmar</button>
          <button style="background-color: #f44336" @click="closeRoleModal">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>
  
  <script>
  import {jwtDecode} from "jwt-decode";
  import HeaderComponent from './Header/HeaderComponent.vue';
  import { inject } from "vue";
  import eventBus from "@/eventBus";

  export default {
    name: "ProfileComponent",
    components: {
      HeaderComponent
    },
    setup() {
      const { getInstance } = inject("socket"); // ✅ Obtener el socket

      return { getInstance };
    },
    data() {
      return {
        roles: ['Administrador', 'Recepcionista', 'LimpiezaYMantenimiento'],
        user: JSON.parse(sessionStorage.getItem('user')) || {},
        isPasswordModalOpen: false,
        isRoleModalOpen: false,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        selectedRole: '',
        userRole: null,
      };
    },
    created() {
      const token = sessionStorage.getItem('token');
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          this.userRole = decodedToken.rol;
        } catch (error) {
          console.error("Error al decodificar el token:", error);
        }
      }
    },
    methods: {
      openPasswordModal() {
        this.isPasswordModalOpen = true;
      },
      closePasswordModal() {
        this.isPasswordModalOpen = false;
        this.clearPasswordFields();
      },
      openRoleModal() {
        this.selectedRole = this.user.Rol;
        this.isRoleModalOpen = true;
      },
      closeRoleModal() {
        this.isRoleModalOpen = false;
      },

      async handleChangePassword() {
        if (this.newPassword !== this.confirmPassword) {
            alert('La nueva contraseña y la confirmación no coinciden.');
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch('http://localhost:3000/employees/changePassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: this.currentPassword,
                    newPassword: this.newPassword
                })
            });

            // Si la respuesta no es exitosa, analiza el mensaje de error devuelto por el servidor
            if (!response.ok) {
                const errorData = await response.json(); // Aquí extraemos el JSON con el mensaje de error
                throw new Error(errorData.error || 'Error desconocido');
            }

            // Si la solicitud es exitosa, mostrar el mensaje de éxito
            alert('Contraseña cambiada exitosamente.');
            this.closePasswordModal();
        } catch (error) {
            console.error('Error al cambiar la contraseña:', error.message);
            alert(`Error al cambiar la contraseña: ${error.message}`);
            this.clearPasswordFields();
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
      // Método para cambiar el rol del usuario si es administrador
      async changeRole() {
        if (this.selectedRole) {
          console.log("Nuevo rol seleccionado: ", this.selectedRole)
          if (this.selectedRole === this.user.rol) {
            alert(`Ya estás en el rol ${this.selectedRole}. Por favor selecciona un rol diferente.`);
            return;
          } else if (this.selectedRole === "Administrador") {
            sessionStorage.removeItem("tempToken");
            alert(`Tu rol ha sido cambiado a: ${this.selectedRole}`);
            const updatedUser = JSON.parse(sessionStorage.getItem('user'));
            if (updatedUser) {
              updatedUser.rol = "Administrador";
            }
            sessionStorage.setItem('user', JSON.stringify(updatedUser))
            this.user = updatedUser;
            this.closeRoleModal();
            this.$router.push('/home');
            return;
          }
          try {
            const token = sessionStorage.getItem('token');
            const response = await fetch('http://localhost:3000/admin/changeRole', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newRole: this.selectedRole })
            });

            if (!response.ok) {
                throw new Error('Error al cambiar el rol');
            }

            const data = await response.json();

            // Guardar el nuevo token temporal en el sessionStorage
            sessionStorage.setItem('tempToken', data.newToken);

            // Actualizar la información del usuario en sessionStorage para reflejar el nuevo rol
            const updatedUser = jwtDecode(data.newToken);
            console.log("Usuario actualizado: ", updatedUser);
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
            this.user = updatedUser;

            // Mostrar mensaje de éxito y redirigir al home del nuevo rol
            alert(`Tu rol ha sido cambiado a: ${this.selectedRole}`);
            this.closeRoleModal();
            this.$router.push('/home');
          } catch (error) {
              console.error('Error al cambiar el rol:', error);
              alert('Hubo un error al intentar cambiar el rol. Por favor, intenta nuevamente.');
          }
        } else {
            alert('Por favor selecciona un rol válido');
        }
      },
      // Método auxiliar para limpiar los campos de la contraseña
      clearPasswordFields() {
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
    },
  };
  </script>
  
  <style scoped>
  .profile-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 100px;
    background: #f5f5f5;
    height: 100%;
    margin: 0;
  }
  
  .profile-details {
    margin-top: 50px;
    margin-bottom: 50px;
    text-align: left;
    width: 100%;
    max-width: 400px;
  }
  
  .button-container {
    margin-top: 20px;
    text-align: center;
  }
  
  button {
    background-color: #3498db;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin: 10px;
  }
  
  button:hover {
    background-color: #2980b9;
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

h3 {
  margin-top: 0;
}

.modal-content {
  background-color: white;
  padding: 40px;
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

.modal-content input, .modal-content select {
  margin-bottom: 15px;
  margin-right: 20px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

  .input-group {
    margin-bottom: 15px;
  }
  
  .input-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  .input-group input,
  select {
    padding: 8px;
    font-size: 16px;
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  </style>
  
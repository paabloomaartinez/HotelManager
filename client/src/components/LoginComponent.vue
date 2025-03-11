<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Iniciar Sesión</h2>
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <label for="username">Nombre de Usuario</label>
          <input
            type="text"
            id="username"
            v-model="login.nombreUsuario"
            placeholder="Inserta tu nombre de usuario"
            required
          />
        </div>

        <div class="input-group">
          <label for="password">Contraseña</label>
          <input
            type="password"
            id="password"
            v-model="login.contrasena"
            placeholder="Inserta tu contraseña"
            required
          />
        </div>

        <div class="button-container">
          <button type="submit" :disabled="isLoading">
            <span v-if="isLoading">Iniciando sesión...</span>
            <span v-else>Iniciar sesión</span>
          </button>
        </div>
      </form>
      <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script>
import { inject } from "vue";
import eventBus from "@/eventBus"; // 🔹 Importamos el Event Bus

export default {
  name: "LoginComponent",
  setup() {
    const { connect: connectSocket } = inject("socket"); // ✅ Inyectamos la función de conexión del socket
    return { connectSocket };
  },
  data() {
    return {
      login: {
        nombreUsuario: "",
        contrasena: "",
      },
      isLoading: false,
      errorMessage: "",
    };
  },
  methods: {
    async handleLogin() {
      if (this.login.nombreUsuario && this.login.contrasena) {
        this.isLoading = true;
        this.errorMessage = "";

        try {
          const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.login),
          });

          if (!response.ok) {
            const errorData = await response.json();
            this.errorMessage = errorData.error || "Error al iniciar sesión";
            return;
          }

          const data = await response.json();

          // 🔹 Guardar los datos en sessionStorage
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("user", JSON.stringify(data.user));

          console.log("🔑 Token guardado, conectando socket...");

          // ✅ Conectar el socket después de que el usuario inicie sesión
          this.connectSocket();

          // ✅ Emitimos el evento `userLoggedIn` para actualizar otros componentes
          eventBus.emit("userLoggedIn", data.user);

          // 🔹 Redirigir al usuario a la página principal
          this.$router.push("/home");
        } catch (error) {
          console.error("❌ Error al iniciar sesión:", error);
          this.errorMessage = "Error de conexión o en el servidor. Inténtalo nuevamente más tarde.";
        } finally {
          this.isLoading = false;
        }
      } else {
        this.errorMessage = "Por favor, completa todos los campos";
      }
    },
  },
};
</script>


<style scoped>
/* Ajuste del contenedor principal */
.login-container {
  display: flex;
  flex-direction: column; /* Apilado de elementos */
  justify-content: center; /* Centra el contenido verticalmente */
  align-items: center; /* Centra el contenido horizontalmente */
  flex: 1; /* Ocupa todo el espacio disponible */
  background: #f5f5f5;
}

/* Caja de login */
.login-box {
  background: #ffffff;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

h2 {
  margin-bottom: 20px;
  font-size: 26px;
  color: #333333;
}

.input-group {
  margin-bottom: 20px;
  text-align: left;
}

.input-group label {
  font-size: 16px;
  color: #555555;
  display: block;
  margin-bottom: 5px;
}

.input-group input {
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #dddddd;
  border-radius: 4px;
  background-color: #f9f9f9;
  transition: border 0.3s ease;
}

.input-group input:focus {
  border-color: #3498db;
  outline: none;
  background-color: #ffffff;
}

.button-container {
  text-align: center;
}

button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:disabled {
  background-color: #87c1e6;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: #2980b9;
}

button:active {
  background-color: #1a6aa1;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>

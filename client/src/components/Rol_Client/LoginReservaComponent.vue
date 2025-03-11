<template>
    <div class="login-container">
      <div class="login-box">
        <h2>Consulta tu Reserva</h2>
        <form @submit.prevent="handleLookup">
          <div class="input-group">
            <label for="localizador">Localizador</label>
            <input
              type="text"
              id="localizador"
              v-model="lookup.localizador"
              placeholder="Introduce tu localizador"
              required
            />
          </div>
  
          <div class="input-group">
            <label for="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              v-model="lookup.email"
              placeholder="Introduce tu correo electrónico"
              required
            />
          </div>
  
          <div class="button-container">
            <button type="submit" :disabled="isLoading">
              <span v-if="isLoading">Consultando...</span>
              <span v-else>Consultar Reserva</span>
            </button>
          </div>
        </form>
        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "LoginReservaComponent",
    data() {
      return {
        lookup: {
          localizador: "",
          email: "",
        },
        isLoading: false,
        errorMessage: "",
        id : this.$route.params.id

      };
    },
    created () {
      this.lookup.localizador = this.id;
    },
    methods: {
      async handleLookup() {
        if (this.lookup.localizador && this.lookup.email) {
          this.isLoading = true;
          this.errorMessage = "";
  
          try {
            const response = await fetch("http://localhost:3000/reservations/getReservation", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(this.lookup),
            });
  
            if (!response.ok) {
              const errorData = await response.json();
              this.errorMessage = errorData.error || "Error al consultar la reserva";
              return;
            }
  
            const reservation = await response.json();
  
            // Guardar el token en sessionStorage
            sessionStorage.setItem("token", reservation.token);
  
            // Redirigir al componente de detalles de la reserva
            this.$router.push({
              path: `/reservations/details/${reservation.reserva.idReserva}`,
            });
          } catch (error) {
            console.error("Error al consultar la reserva:", error);
            this.errorMessage =
              "Error de conexión o en el servidor. Inténtalo nuevamente más tarde.";
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
  .login-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #f5f5f5;
  }
  
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
  
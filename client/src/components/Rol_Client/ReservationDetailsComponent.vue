<template>
  <div class="reservation-details-container">
    <!-- Resumen de la reserva -->
    <div class="reservation-summary">
      <h3>Detalles de la Reserva</h3>
      <div class="summary-item">
        <p><strong>Localizador:</strong> {{ reservation?.idReserva }}</p>
        <p><strong>Cliente:</strong> {{ reservation?.clienteNombre }}</p>
        <p><strong>Fecha de Entrada:</strong> {{ formatDate(reservation?.fechaEntrada) }}</p>
        <p><strong>Fecha de Salida:</strong> {{ formatDate(reservation?.fechaSalida) }}</p>
        <p><strong>Número de Personas:</strong> {{ reservation?.numPersonas }}</p>
        <p><strong>Estado:</strong> {{ reservation?.estado }}</p>
      </div>
      <div class="summary-item">
        <h4>Habitaciones</h4>
        <ul>
          <li v-for="room in reservation?.habitaciones" :key="room.numHabitacion">
            Número: {{ room.numHabitacion }} ({{ room.tipoHabitacion }})
          </li>
        </ul>
      </div>
      <div class="summary-item" v-if="reservation?.servicios.length">
        <h4>Servicios Contratados</h4>
        <ul>
          <li v-for="(service, index) in reservation?.servicios" :key="index">
            {{ service }}
          </li>
        </ul>
      </div>
      <div class="summary-item">
        <p><strong>Precio Total:</strong> €{{ reservation?.precio }}</p>
      </div>

      <!-- Factura: abrir y descargar -->
      <div v-if="reservation?.estado === 'Finalizada'" class="summary-item">
        <h4>Factura</h4>
        <a
          :href="`http://localhost:3000/factura/${reservation?.idReserva}`"
          target="_blank"
          class="btn-open"
        >Abrir Factura</a>
      </div>

      <!-- Contenedor para el botón de PayPal -->
      <div v-if="reservation?.estado === 'Finalizada'" id="paypal-button-container"></div>
    </div>
    <div class="action-buttons">
      <button @click="logout" class="btn-logout">Cerrar Sesión</button>
    </div>
  </div>
</template>

<script>
/* global paypal */

export default {
  name: "ReservationDetailsComponent",
  data() {
    return {
      reservation: null, // Información de la reserva
    };
  },
  created() {
    this.fetchReservationDetails();
  },
  mounted() {
    this.loadPayPalScript();
  },
  methods: {
    formatDate(date) {
      if (!date) return "-";
      // Formato de fecha legible (por ejemplo, DD/MM/YYYY)
      return new Date(date).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    async fetchReservationDetails() {
      const id = this.$route.params.id;
      try {
        const response = await fetch(
          `http://localhost:3000/reservations/getReservationDetails/${id}`
        );
        if (!response.ok) throw new Error("Error al obtener los detalles de la reserva");
        this.reservation = await response.json();
      } catch (error) {
        console.error(error);
        alert("Error al cargar los detalles de la reserva.");
      }
    },
    async loadPayPalScript() {
      try {
        const response = await fetch("http://localhost:3000/config/paypal");
        const { clientId } = await response.json();

        if (!clientId) {
          throw new Error("No se pudo obtener el Client ID de PayPal.");
        }

        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR`;
        script.onload = this.setupPayPalButton;
        document.body.appendChild(script);
      } catch (error) {
        console.error("Error al cargar el SDK de PayPal:", error);
      }
    },
    setupPayPalButton() {
      paypal.Buttons({
        style: {
          layout: "vertical", // Diseño del botón
          color: "gold", // Color del botón
          shape: "rect", // Forma del botón
          tagline: false, // Muestra u oculta el tagline
        },
        createOrder: (data, actions) => {
          // Verifica y convierte el precio
          let precio = Number(this.reservation?.precio);

          // Maneja casos donde el precio no es un número válido
          if (isNaN(precio)) {
            console.error("El precio no es un número válido:", this.reservation?.precio);
            throw new Error("El precio no es un número válido.");
          }

          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: precio.toFixed(2), // Asegura que el precio tenga 2 decimales
                },
              },
            ],
          });
        },
        onApprove: (data, actions) => {
          return actions.order.capture().then((details) => {
            alert(`Pago completado por ${details.payer.name.given_name}`);
            console.log("Detalles del pago:", details);
          });
        },
        onError: (err) => {
          console.error("Error al procesar el pago:", err);
          alert("Hubo un error al procesar el pago. Intenta de nuevo.");
        },
      }).render("#paypal-button-container"); // Renderizar el botón de PayPal
    },
    logout() {
      const id = this.$route.params.id;
      // Borrar el token
      localStorage.removeItem("token");
      // Redirigir al login
      this.$router.push(`/reservations/${id}`);
    },
  },
};
</script>

<style scoped>
.reservation-details-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  height: 100vh;
  gap: 40px;
  padding: 20px;
}
.reservation-summary {
  padding: 20px;
  width: 400px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.reservation-summary h3 {
  margin-bottom: 15px;
  font-size: 20px;
  color: #333;
  border-bottom: 2px solid #3498db;
  padding-bottom: 5px;
}

.action-buttons {
  display: flex;
  justify-content: center;
}

.summary-item {
  background: #ffffff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 15px;
  margin-bottom: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.summary-item h4 {
  margin-bottom: 5px;
  margin-top: 5px;
}

.summary-item p {
  margin: 5px 0;
  font-size: 14px;
  color: #555;
}

.summary-item strong {
  color: #333;
}

.summary-item ul {
  padding-left: 20px;
  list-style: none;
  margin: 0;
}

.btn-logout {
  padding: 10px 20px;
  color: white;
  background-color: #e74c3c;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-logout:hover {
  background-color: #c0392b;
}

.btn-open,
.btn-download {
  display: inline-block;
  margin: 5px 10px 0 0;
  padding: 8px 12px;
  background-color: #3498db;
  color: #fff;
  text-decoration: none;
  border-radius: 5px;
  font-size: 14px;
  text-align: center;
  transition: background-color 0.3s ease;
}

.btn-open:hover {
  background-color: #2980b9;
}

.btn-download:hover {
  background-color: #1f618d;
}

a {
  width: 90%;
}
</style>

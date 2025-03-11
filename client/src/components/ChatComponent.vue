<template>
  <div class="chat-popup">
    <button class="chat-toggle" @click="toggleChat">
      <i class="bx bxs-message-dots" style="color: #f5f5f5; font-size: 25px;"></i>
      <span v-if="totalUnreadMessages > 0" class="unread-total">
        {{ totalUnreadMessages }}
      </span>
    </button>

    <div v-if="isChatOpen" class="chat-container">
      <div class="users-list">
        <h3>Usuarios conectados</h3>
        <ul v-if="filteredUsers.length > 0">
          <li
            v-for="user in filteredUsers"
            :key="user.numeroDocumento"
            @click="selectUser(user)"
            :class="{ active: selectedUser?.numeroDocumento === user.numeroDocumento }"
          >
            {{ user.nombre }}
            <span v-if="unreadMessages[user.numeroDocumento] > 0" class="unread-badge">
              {{ unreadMessages[user.numeroDocumento] }}
            </span>
          </li>
        </ul>
        <p v-else class="no-users">No hay otros usuarios conectados</p>
      </div>

      <div class="chat-window" v-if="selectedUser">
        <div class="chat-header">
          <h3>Chat con {{ selectedUser.nombre }}</h3>
          <a @click="closeChatWindow">
            <i class="bx bxs-x-circle" style="color: #ff0004"></i>
          </a>
        </div>

        <!-- ✅ Se agrega `ref="chatMessages"` para el scroll automático -->
        <div ref="chatMessages" class="chat-messages">
          <div
            v-for="(message, index) in messages[selectedUser.numeroDocumento] || []"
            :key="index"
            :class="['message', message.sender === myId ? 'sent' : 'received']"
          >
            <strong>
              {{ message.sender === myId ? "Yo" : selectedUser.nombre }}:
            </strong>
            {{ message.text }}
          </div>
        </div>

        <div class="chat-input">
          <input
            type="text"
            v-model="newMessage"
            placeholder="Escribe un mensaje..."
            @keyup.enter="sendMessage"
          />
          <button @click="sendMessage">Enviar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { inject, nextTick } from "vue";
import eventBus from "@/eventBus"; // 🔹 Importamos el Event Bus

export default {
  name: "ChatPopup",
  setup() {
    const { getInstance, connect } = inject("socket"); // ✅ Obtenemos la instancia y la función para conectar
    return { getInstance, connect };
  },
  data() {
    return {
      isChatOpen: false,
      connectedUsers: [],
      selectedUser: null,
      messages: {},
      newMessage: "",
      myId: null,
      unreadMessages: {},
      socket: null
    };
  },
  computed: {
    filteredUsers() {
      return this.connectedUsers.filter((user) => user.numeroDocumento !== this.myId);
    },
    totalUnreadMessages() {
      return Object.values(this.unreadMessages).reduce((acc, val) => acc + val, 0);
    },
  },
  mounted() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    this.myId = user?.numeroDocumento || null;

    this.socket = this.getInstance();

    if (!this.socket) {
      console.warn("⚠️ Socket no encontrado, intentando conectar...");
      this.connect(); // 🔹 Intentar conectar el socket si no está inicializado
      this.socket = this.getInstance();
    }

    if (!this.socket) {
      console.error("❌ Error: `socket` es undefined en `mounted()`. Verifica que el socket se haya inicializado.");
      return;
    }
    // ✅ Pedir la lista de usuarios conectados al iniciar el componente
    this.socket.emit("requestConnectedUsers");

    eventBus.on("socketUsersUpdated", (users) => {
      this.connectedUsers = users;
    });

    eventBus.on("userLoggedIn", () => {
      console.log("🔄 Usuario ha iniciado sesión, solicitando usuarios conectados...");
      this.socket.emit("requestConnectedUsers");
    });

    eventBus.on("userLoggedOut", () => {
      console.log("🔄 Usuario cerró sesión, actualizando lista de usuarios conectados...");
      this.socket.emit("requestConnectedUsers");
    });

    if (this.socket && this.socket.connected) {
      this.socket.emit("requestConnectedUsers");
    }

    eventBus.on("socketMessageReceived", (message) => {
      if (!this.messages[message.sender]) {
        this.messages[message.sender] = [];
      }
      this.messages[message.sender].push(message);

      if (message.recipient === this.myId) {
        if (!this.unreadMessages[message.sender]) {
          this.unreadMessages[message.sender] = 0;
        }
        this.unreadMessages[message.sender]++;
      }

      // 🔹 Desplazar al último mensaje al recibir un nuevo mensaje
      this.scrollToBottom();
    });

    eventBus.on("socketUnreadMessages", (unread) => {
      this.unreadMessages = unread || {};
    });

    this.socket.on("chatHistory", async ({ withUserId, messages }) => {
      if (!messages) return;
      this.messages[withUserId] = messages;
      
      // 🔹 Esperar a que Vue renderice los mensajes antes de hacer scroll
      await nextTick();
      this.scrollToBottom();
    });

    document.addEventListener("click", this.handleOutsideClick);
  },
  beforeUnmount() {
    document.removeEventListener("click", this.handleOutsideClick);
    eventBus.off("socketUsersUpdated");
    eventBus.off("socketMessageReceived");
    eventBus.off("socketUnreadMessages");
    eventBus.off("userLoggedOut");
  },
  methods: {
    toggleChat() {
      this.isChatOpen = !this.isChatOpen;
    },
    selectUser(user) {
      this.selectedUser = user;

      if (!this.messages[user.numeroDocumento]) {
        this.messages[user.numeroDocumento] = [];
      }

      if (this.socket) {
        this.socket.emit("getChatHistory", { withUserId: user.numeroDocumento });
      } else {
        console.error("❌ No se pudo enviar `getChatHistory` porque `this.socket` no está disponible.");
      }

      if (this.unreadMessages[user.numeroDocumento]) {
        this.unreadMessages[user.numeroDocumento] = 0;
      }

      this.socket.emit("chatOpened", { chatWith: user.numeroDocumento });

      // 🔹 Esperar a que el chat se renderice y hacer scroll al último mensaje
      nextTick().then(() => this.scrollToBottom());
    },
    closeChatWindow() {
      if (this.selectedUser) {
        this.socket.emit("chatClosed", { chatWith: this.selectedUser.numeroDocumento });
      }
      this.selectedUser = null;
    },
    sendMessage() {
      if (this.newMessage.trim() === "") return;

      const message = {
        sender: this.myId,
        recipient: this.selectedUser.numeroDocumento,
        text: this.newMessage,
        timestamp: new Date().toISOString(),
      };

      if (!this.messages[this.selectedUser.numeroDocumento]) {
        this.messages[this.selectedUser.numeroDocumento] = [];
      }

      if (this.socket) {
        this.socket.emit("privateMessage", {
          toUserId: this.selectedUser.numeroDocumento,
          text: message.text,
        });
      } else {
        console.error("❌ No se pudo enviar mensaje porque `this.socket` no está disponible.");
      }

      this.messages[this.selectedUser.numeroDocumento].push(message);
      this.newMessage = "";

      // 🔹 Desplazar al último mensaje después de enviar uno nuevo
      nextTick().then(() => this.scrollToBottom());
    },
    scrollToBottom() {
      const chatContainer = this.$refs.chatMessages;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    },
    handleOutsideClick(event) {
      const chatContainer = this.$el.querySelector(".chat-container");
      const toggleButton = this.$el.querySelector(".chat-toggle");

      if (
        this.isChatOpen &&
        chatContainer &&
        !chatContainer.contains(event.target) &&
        toggleButton &&
        !toggleButton.contains(event.target)
      ) {
        this.isChatOpen = false;
      }
    },
  },
};
</script>

<style scoped>
.chat-popup {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.chat-toggle {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-size: 30px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.chat-container {
  display: flex;
  position: fixed;
  bottom: 90px;
  right: 32px;
  width: 400px;
  height: 500px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.users-list {
  width: 30%;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  padding: 10px;
}

.users-list h3 {
  font-size: 15px;
}

.users-list ul {
  list-style: none;
  padding: 0;
}

.users-list li {
  padding: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.users-list li.active {
  background: #f0f0f0;
}

.no-users {
  text-align: center;
  color: #999;
  margin-top: 20px;
}

.chat-window {
  width: 70%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 5px;
}

.chat-header a {
  margin: 5px;
  font-size: 25px;
  cursor: pointer;
  align-items: center;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.message {
  margin-bottom: 8px;
}

.message.sent {
  text-align: right;
  color: green;
}

.message.received {
  text-align: left;
  color: blue;
}

.chat-input {
  padding: 10px;
  border-top: 1px solid #ddd;
  display: flex;
  gap: 8px;
}

.chat-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.unread-badge {
  background: red;
  color: white;
  border-radius: 50%;
  font-size: 14px;
  width: 20px;
  height: 20px;
  text-align: center;
}

.unread-total {
  position: absolute;
  top: 5px;
  right: 5px;
  background: red;
  color: white;
  font-size: 14px;
  font-weight: bold;
  width: 20px;
  height: 20px;
  text-align: center;
  border-radius: 50%;
}

.unread-badge {
  background: red;
  color: white;
  border-radius: 50%;
  font-size: 14px;
  width: 20px;
  height: 20px;
  text-align: center;
}


</style>

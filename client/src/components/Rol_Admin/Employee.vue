<template>
  <HeaderComponent />
  <div class="employee-container">
    <h1>Gestión de Empleados</h1>
    <div class="button-container">
      <button @click="showAddEmployeeModal = true" class="btn-add">Añadir empleado</button>
    </div>

    <!-- Modal de añadir empleado -->
    <div v-if="showAddEmployeeModal" class="modal">
      <div class="modal-content">
        <h3>Añadir nuevo empleado</h3>
        <form @submit.prevent="addEmployee">
          <label for="name">Nombre:</label>
          <input type="text" v-model="newEmployee.Nombre" required />

          <label for="apellidos">Apellidos:</label>
          <input type="text" v-model="newEmployee.Apellidos" required />

          <label for="tipoDocumento">Tipo de Documento:</label>
          <select v-model="newEmployee.Tipo_documento" required>
            <option value="DNI">DNI</option>
            <option value="Pasaporte">Pasaporte</option>
          </select>

          <label for="numeroDocumento">Número de Documento:</label>
          <input type="text" v-model="newEmployee.Numero_documento" required />

          <label for="rol">Rol:</label>
          <select v-model="newEmployee.Rol" required>
            <option value="Administrador">Administrador</option>
            <option value="Recepcionista">Recepcionista</option>
            <option value="LimpiezaYMantenimiento">LimpiezaYMantenimiento</option>
          </select>

          <label for="usuario">Usuario:</label>
          <input type="text" v-model="newEmployee.Usuario" required />

          <label for="contraseña">Contraseña:</label>
          <input type="password" v-model="newEmployee.contrasena" required />

          <div class="button-group">
            <button type="submit" class="btn-save">Guardar</button>
            <button type="button" @click="showAddEmployeeModal = false" class="btn-cancel">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Apellidos</th>
          <th>Número de Documento</th>
          <th>Rol</th>
          <th>Usuario</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="empleado in empleados" :key="empleado.Numero_documento" :class="{ 'editing-row': isEditing(empleado) }">
          <td v-if="isEditing(empleado)">
            <input type="text" v-model="editableEmployee.Nombre" class="editable-input" />
          </td>
          <td v-else>{{ empleado.Nombre }}</td>

          <td v-if="isEditing(empleado)">
            <input type="text" v-model="editableEmployee.Apellidos" class="editable-input" />
          </td>
          <td v-else>{{ empleado.Apellidos }}</td>

          <td v-if="isEditing(empleado)">
            <input type="text" v-model="editableEmployee.Numero_documento" class="editable-input" readonly/>
          </td>
          <td v-else>{{ empleado.Numero_documento }}</td>

          <td v-if="isEditing(empleado)">
            <select v-model="editableEmployee.Rol" class="editable-select">
              <option value="Administrador">Administrador</option>
              <option value="Recepcionista">Recepcionista</option>
              <option value="LimpiezaYMantenimiento">LimpiezaYMantenimiento</option>
            </select>
          </td>
          <td v-else>{{ empleado.Rol }}</td>

          <td v-if="isEditing(empleado)">
            <input type="text" v-model="editableEmployee.Usuario" class="editable-input" />
          </td>
          <td v-else>{{ empleado.Usuario }}</td>

          <td class="actions">
            <i 
              class="bx"
              :class="isEditing(empleado) ? 'bxs-save save-icon' : 'bxs-edit-alt edit-icon'" 
              @click="toggleEdit(empleado)" 
              :title="isEditing(empleado) ? 'Guardar' : 'Modificar'" 
              style="cursor: pointer;"
            ></i>
            <i 
              v-if="isEditing(empleado)" 
              class="bx bx-x-circle cancel-icon" 
              @click="cancelEdit" 
              title="Cancelar" 
              style="cursor: pointer;"
            ></i>
            <i 
              v-else 
              class="bx bx-trash delete-icon" 
              @click="deleteEmployee(empleado.Numero_documento)" 
              title="Eliminar" 
              style="cursor: pointer;"
            ></i>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { inject, onMounted, onUnmounted, ref } from "vue";
import HeaderComponent from "../Header/HeaderComponent.vue";

export default {
  name: "CreateEmployee",
  components: { HeaderComponent },

  setup() {
    const socket = inject("socket").getInstance(); // Instancia de socket
    const empleados = ref([]); // Lista de empleados
    const showAddEmployeeModal = ref(false); // Modal para agregar empleados
    const editingId = ref(null); // ID del empleado en edición
    const newEmployee = ref({
      Nombre: "",
      Apellidos: "",
      Tipo_documento: "",
      Numero_documento: "",
      Rol: "",
      Usuario: "",
      contrasena: "",
    });

    const editableEmployee = ref({}); // Empleado editable

    // **Cargar lista de empleados**
    const fetchEmployees = async () => {
      try {
        const response = await fetch("http://localhost:3000/admin/employees/getEmployees");
        empleados.value = await response.json();
      } catch (error) {
        console.error("Error al obtener empleados:", error);
      }
    };

    // **Añadir nuevo empleado**
    const addEmployee = async () => {
      try {
        const response = await fetch("http://localhost:3000/admin/employees/addEmployee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEmployee.value),
        });

        if (!response.ok) throw new Error("Error al añadir el empleado");

        showAddEmployeeModal.value = false;
        newEmployee.value = {
          Nombre: "",
          Apellidos: "",
          Tipo_documento: "",
          Numero_documento: "",
          Rol: "",
          Usuario: "",
          contrasena: "",
        };

        // Emitir evento para actualizar empleados en tiempo real
        socket.emit("actualizarEmpleado");

      } catch (error) {
        console.error("Error al añadir empleado:", error);
      }
    };

    // **Actualizar empleado**
    const updateEmployee = async () => {
      try {
        await fetch("http://localhost:3000/admin/employees/updateEmployee", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editableEmployee.value),
        });

        editingId.value = null; // Salir del modo edición
        socket.emit("actualizarEmpleado"); // Notificar a otros clientes

      } catch (error) {
        console.error("Error al actualizar el empleado:", error);
      }
    };

    // **Eliminar empleado**
    const deleteEmployee = async (numeroDocumento) => {
      if (!confirm("¿Estás seguro de que deseas eliminar este empleado?")) return;

      try {
        await fetch(`http://localhost:3000/admin/employees/deleteEmployee/${numeroDocumento}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        socket.emit("actualizarEmpleado"); // Notificar a otros clientes

      } catch (error) {
        console.error("Error al eliminar el empleado:", error);
      }
    };

    // **Modo Edición**
    const toggleEdit = (empleado) => {
      if (isEditing(empleado)) {
        updateEmployee();
      } else {
        editingId.value = empleado.Numero_documento;
        editableEmployee.value = { ...empleado };
      }
    };

    // **Comprobar si está en edición**
    const isEditing = (empleado) => editingId.value === empleado.Numero_documento;

    // **Escuchar eventos de Socket.io**
    onMounted(() => {
      fetchEmployees();

      // 🔴 Escuchar evento de actualización de empleados
      socket.on("actualizarEmpleado", () => {
        console.log("📢 Actualizando lista de empleados...");
        fetchEmployees();
      });
    });

    onUnmounted(() => {
      socket.off("actualizarEmpleado");
    });

    return {
      empleados,
      newEmployee,
      showAddEmployeeModal,
      editingId,
      editableEmployee,
      fetchEmployees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      toggleEdit,
      isEditing,
    };
  },
  created() {
    this.fetchEmployees();
  },
  methods: {
    cancelEdit() {
      this.editingId = null; // Salir del modo edición sin guardar
    },
  }
};
</script>

<style scoped>
.employee-container {
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.button-container {
  display: flex;
  justify-content: center;
  gap: 20px;
}

h1 {
  text-align: center;
  color: #171a20;
  margin-bottom: 20px;
}

table {
  width: 80%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: 20px;
  margin-bottom: 20px;
}

th, td {
  border-bottom: 1px solid #ddd;
  text-align: left;
  color: #171a20;
  padding: 15px;
}

th {
  background-color: #2c3e50;
  color: white;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

tr:hover {
  background-color: #f1f1f1;
}

.editing-row {
  background-color: #f0f8ff;
}

.editable-input, .editable-select {
  border: 2px solid #4CAF50;
  border-radius: 4px;
  padding: 8px;
  font-size: 14px;
  width: 100%;
}

.actions i {
  font-size: 20px;
  transition: color 0.3s ease;
  padding: 4px 10px;
}

.actions i:hover {
  color: #171a20;
}

.save-icon {
  color: #4CAF50;
}

.edit-icon {
  color: #2196f3;
}

.cancel-icon {
  color: #f44336;
}

.delete-icon {
  color: #f44336;
}

@media (max-width: 768px) {
  table {
    width: 100%;
  }
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

.modal-content {
  background-color: white;
  padding: 20px;
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
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.modal-content form {
  display: flex;
  flex-direction: column;
}

.modal-content .button-group {
  display: flex;
  justify-content: space-between; /* Espaciado entre los botones */
  margin-top: 10px;
}

.modal-content .button-group button {
  flex: 1; /* Para que ambos botones tengan el mismo tamaño */
  margin: 0 5px; /* Espaciado entre los botones */
}

.btn-add {
  padding: 12px 20px;
  font-size: 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  height: 44px;
}

.btn-save {
  padding: 12px 20px;
  font-size: 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  height: 44px;
}

.btn-cancel {
  background-color: #f9f9f9;
  color: #333;
  padding: 12px 20px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s ease-in-out;
}
</style>

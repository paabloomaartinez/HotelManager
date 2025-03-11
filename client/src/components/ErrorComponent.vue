<template>
    <div class="error-container">
      <h1>404</h1>
      <p>La página que buscas no existe.</p>
      <router-link to="/" class="back-home-link">Volver al inicio</router-link>
    </div>
  </template>
  
  <script>
  export default {
    name: "ErrorComponent",
  };
  </script>
  
  <style scoped>
  .error-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    text-align: center;
    background-color: #f8f9fa;
    color: #343a40;
    font-family: Arial, sans-serif;
  }
  
  h1 {
    font-size: 8rem;
    margin: 0;
    color: #dc3545;
  }
  
  p {
    font-size: 1.5rem;
    margin: 10px 0;
  }
  
  .back-home-link {
    display: inline-block;
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 1rem;
    color: #ffffff;
    background-color: #007bff;
    text-decoration: none;
    border-radius: 5px;
    transition: background-color 0.3s ease;
  }
  
  .back-home-link:hover {
    background-color: #0056b3;
  }
  </style>
  
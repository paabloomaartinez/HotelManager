<template>
    <div class="logo-link">
      <router-link to="/home" class="logo-item">
        <i class="bx bxs-home" style="color:#171a20"></i>
      </router-link>
    </div>
  </template>
  
  <script>
  export default {
    name: "LogoLink",
  };
  </script>
  
  <style scoped>
  .logo-link {
    padding-left: 32px;
    flex: 1;
  }
  
  .logo-item {
    font-size: 14px;
    color: #171A20;
    text-decoration: none;
    font-weight: 500;
    justify-content: flex-end;
    align-items: center;
    flex: 1;
  }
  
  .logo-item i {
    font-size: 25px;
    cursor: pointer;
    padding-right: 32px;
  }
  </style>
  
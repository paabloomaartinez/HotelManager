<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
export default {
  name: "App"
};
</script>

<style>
body , html{
  font-family:"Open Sans", sans-serif;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  color: #171a20;
}

.content {
  display: flex;
  flex-direction: column;
}
</style>
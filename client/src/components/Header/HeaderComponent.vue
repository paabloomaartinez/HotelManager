<template>
  <header class="header">
    <LogoLink />
    <UserMenu />
  </header>
</template>

<script>
import LogoLink from "./LogoLink.vue";
import UserMenu from "./UserMenu.vue";

export default {
  name: "HeaderComponent",
  components: {
    LogoLink,
    UserMenu,
  },
};
</script>

<style scoped>
.header {
  background-color: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 10px;
}
</style>

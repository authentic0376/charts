<template>
  <NuxtLink :to="to" class="link link--elara">
    <!-- Display 'text' if provided, otherwise display 'to' -->
    <span>{{ text || to }}</span>
  </NuxtLink>
</template>

<script setup>
// Define the props the component accepts
defineProps({
  // 'to' for the link destination (still required)
  to: {
    type: String,
    required: true
  },
  // 'text' for the link display text (now optional)
  text: {
    type: String,
    // No longer required: true
    // You could add default: '' if you prefer an empty string over undefined when not passed
  }
});
</script>

<style scoped>
/* Styles specific to this component */
/* We use 'scoped' to prevent these styles from affecting other elements */

/* link */
.link {
  cursor: pointer;
  /* font-size is inherited or set by link--elara */
  position: relative;
  white-space: nowrap;
  text-decoration: none; /* Add this to remove default underline */
  color: inherit; /* Inherit color from parent by default */
}

.link::before,
.link::after {
  position: absolute;
  width: 100%;
  height: 1px;
  background: currentColor; /* Use the link's current text color */
  top: 100%;
  left: 0;
  pointer-events: none;
}

.link::before {
  content: '';
  /* show by default */
}

/* link--elara specific styles */
.link--elara {
  font-family: aktiv-grotesk-extended, sans-serif;
  font-size: 1.375rem;
  /* You might want to set a default color here or let it be inherited */
  /* color: #333; */
}

.link--elara::before {
  transform-origin: 50% 100%;
  transition: clip-path 0.3s, transform 0.3s cubic-bezier(0.2, 1, 0.8, 1);
  clip-path: polygon(0% 0%, 0% 100%, 0 100%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%, 100% 100%, 100% 0%);
}

.link--elara:hover::before {
  transform: translate3d(0, 2px, 0) scale3d(1.08, 3, 1);
  clip-path: polygon(0% 0%, 0% 100%, 50% 100%, 50% 0, 50% 0, 50% 100%, 50% 100%, 0 100%, 100% 100%, 100% 0%);
}

.link--elara span {
  display: inline-block;
  transition: transform 0.3s cubic-bezier(0.2, 1, 0.8, 1);
}

.link--elara:hover span {
  transform: translate3d(0, -2px, 0);
}
</style>
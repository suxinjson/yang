<template><ModelPreview :catalog-id="catalogId" :width="width" :height="height" /></template>
<script setup lang="ts">
import ModelPreview from './ModelPreview.vue'
withDefaults(defineProps<{catalogId:string;width?:number;height?:number}>(),{width:80,height:60})
</script>
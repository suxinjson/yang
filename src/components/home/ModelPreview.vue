<template>
  <span class="model-preview" :class="{ 'model-fallback': !source }" :style="{ width: `${width}px`, height: `${height}px` }" role="img" :aria-label="label || catalogId">
    <img v-if="source" :src="source" alt="" draggable="false" />
    <svg v-else viewBox="0 0 80 80" aria-hidden="true"><path d="M14 30 40 16 66 30 40 45Z" fill="#d2c2a9"/><path d="M14 30v28l26 14V45Z" fill="#a78d70"/><path d="M40 45v27l26-14V30Z" fill="#80765f"/></svg>
  </span>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { ModelOptions } from '../../utils/models'
const props = withDefaults(defineProps<{ catalogId: string; width?: number; height?: number; label?: string; options?: ModelOptions }>(), { width: 88, height: 88 })
const source=ref(''); let generation=0
async function render() { const current=++generation; try { const {modelImage}=await import('../../utils/models'); if(current===generation) source.value=modelImage(props.catalogId, props.options) } catch { source.value='' } }
onMounted(render); watch(()=>[props.catalogId,props.options],render,{deep:true})
</script>
<style scoped>
.model-preview{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;max-width:100%;vertical-align:middle;filter:drop-shadow(0 7px 5px #40372b20)}
.model-preview img,.model-preview svg{width:100%;height:100%;object-fit:contain;pointer-events:none}
</style>

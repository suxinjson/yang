<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="design-icon"><path :d="paths[name] || paths.spark"/></svg></template>
<script setup lang="ts">
defineProps<{name:string}>()
const paths:Record<string,string>={
bag:'M7 7V5a5 5 0 0 1 10 0v2M5 7h14l1 14H4L5 7Zm4 4v2m6-2v2',
heart:'M12 21S2 15 2 8a5 5 0 0 1 10-2A5 5 0 0 1 22 8c0 7-10 13-10 13Z',
shop:'M3 9 5 3h14l2 6M3 9v3a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2V9H3Zm2 6v6h14v-6m-9 6v-5h4v5',
work:'M3 6h18v13H3V6Zm5 0V3h8v3M3 11q9 5 18 0m-9 1v3',
pet:'M7 16q5-8 10 0c4 7-3 6-5 5s-9 2-5-5ZM5 8c-3-4-5 3-2 4s4-1 2-4Zm6-3c-1-5-5-3-4 1s5 3 4-1Zm6 1c1-5-3-6-4-2s3 6 4 2Zm5 6c3-4-2-7-3-3s1 6 3 3Z',
tools:'m4 20 10-10m1-7a5 5 0 0 0-5 6L2 17l5 5 8-8a5 5 0 0 0 6-6l-4 4-5-5 4-4',
room:'M4 22V3l13-2v21M17 6h4v16H1m11-10v3',
coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM14 8h-4v4h4v4h-4m2-10v2m0 8v2',
user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3',
trophy:'M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 3v6m-5 0h10',
game:'M7 6h10q5 0 6 12c0 5-5 3-7-1H8c-2 4-7 6-7 1Q2 6 7 6Zm-2 5h6m-3-3v6m8-3h.01m3 3h.01',
sofa:'M5 10V6q0-3 3-3h8q3 0 3 3v4M5 17h14M5 10q-4-2-4 2v7h22v-7q0-4-4-2v7m-14-7v7m-2 2v3m18-3v3',
spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
mirror:'M5 20V9a7 7 0 0 1 14 0v11H5Zm-2 2h18M9 7l6 6m-6-2 3 3',
shirt:'m8 3-6 4 4 5 2-2v12h8V10l2 2 4-5-6-4q-4 5-8 0Z',
sound:'M3 9h4l6-6v18l-6-6H3V9Zm14-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16',
gift:'M3 10h18v11H3V10Zm-1-4h20v4H2V6Zm10 0v15m0-15C3 7 5-2 10 3l2 3Zm0 0c9 1 7-8 2-3l-2 3Z'
}
</script>
<style scoped>.design-icon{width:1.15em;height:1.15em;display:inline-block;vertical-align:-.16em;flex-shrink:0}</style>

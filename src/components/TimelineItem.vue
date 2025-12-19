<script setup lang="ts">
import { computed } from 'vue';
import type { Bookmark } from '../types';

const props = defineProps<{
  bookmark: Bookmark;
}>();

const emit = defineEmits(['edit', 'jump']);

// Format seconds to HH:MM:SS or MM:SS
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  
  return h > 0 ? `${h}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
};

const hasText = computed(() => !!props.bookmark.text && props.bookmark.text.trim().length > 0);
</script>

<template>
  <div class="timeline-row">
    <div class="time-clickable" @click="$emit('jump', bookmark.time)">
        <span class="time-code">{{ formatTime(bookmark.time) }}</span>
    </div>

    <div class="content-area" @click="$emit('edit', bookmark)">
        <div v-if="hasText" class="note-text">{{ bookmark.text }}</div>
        <div v-else class="no-text">No notes</div>
    </div>
    
    <button class="add-note-btn" @click.stop="$emit('edit', bookmark)">
       <svg v-if="!hasText" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
       </svg>
       <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
       </svg>
    </button>
  </div>
</template>

<style scoped>
.timeline-row {
    display: flex;
    align-items: flex-start; /* Align top for multi-line text */
    padding: 16px;
    background: #1C1C1E; /* Card background match */
    border-radius: 12px;
    margin-bottom: 12px;
    gap: 16px;
    border: 1px solid #38383A;
}

.time-clickable {
    cursor: pointer;
    min-width: 60px;
}

.time-code {
    font-weight: 600;
    font-size: 15px; /* Slightly larger timestamp */
    font-variant-numeric: tabular-nums;
    color: #fff;
    background: rgba(255,255,255,0.1);
    padding: 4px 8px;
    border-radius: 6px;
}

.content-area {
    flex: 1;
    cursor: pointer;
    min-width: 0; /* Text truncation */
}

.note-text {
    font-size: 16px;
    line-height: 1.4;
    color: #E5E5EA;
    /* Limit to 2 lines */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.no-text {
    font-style: italic;
    color: #636366;
    font-size: 15px;
}

.add-note-btn {
    background: none;
    border: none;
    color: #0A84FF;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.add-note-btn:active {
    opacity: 0.6;
}
</style>

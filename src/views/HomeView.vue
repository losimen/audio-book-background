<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router'; // Import useRouter
import { db } from '../db';
import type { AudioFile } from '../db';
import FileUpload from '../components/FileUpload.vue';
import { liveQuery, type Subscription } from 'dexie';

const router = useRouter(); 
const files = ref<AudioFile[]>([]);
let subscription: Subscription | null = null;

onMounted(() => {
  const observable = liveQuery(() => db.files.orderBy('uploadedAt').reverse().toArray());
  subscription = observable.subscribe({
    next: result => files.value = result,
    error: error => console.error(error)
  });
});

onUnmounted(() => {
  if (subscription) subscription.unsubscribe();
});

const openFile = (id: number) => {
  router.push(`/player/${id}`);
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
};
</script>

<template>
  <div class="home-page">
    <header>
      <h1>Library</h1>
    </header>

    <main>
      <FileUpload />

      <div class="file-list">
        <div 
          v-for="file in files" 
          :key="file.id" 
          class="file-item"
          @click="file.id && openFile(file.id)"
        >
          <div class="file-icon">🎵</div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-meta">
              {{ formatTime(file.uploadedAt) }}
              <span v-if="file.playbackPosition > 0" class="progress-indicator">
                • {{ Math.floor(file.playbackPosition / 60) }}:{{ String(Math.floor(file.playbackPosition % 60)).padStart(2, '0') }} left
              </span>
            </div>
          </div>
          <div class="chevron">›</div>
        </div>
        
        <div v-if="files && files.length === 0" class="empty-state">
          No files yet. Upload one to start listening.
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  padding: 20px;
  padding-bottom: 100px;
}

header h1 {
  font-size: 34px;
  font-weight: 700;
  margin-bottom: 20px;
}

.file-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  background-color: var(--app-secondary);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-item:active {
  background-color: #2C2C2E;
}

.file-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  background: #2C2C2E;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-meta {
  font-size: 13px;
  color: #8E8E93;
}

.progress-indicator {
  color: var(--app-accent);
}

.chevron {
  color: #8E8E93;
  font-size: 20px;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  color: #8E8E93;
  margin-top: 40px;
  font-size: 15px;
}
</style>

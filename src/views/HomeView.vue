<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router'; // Import useRouter
import { db } from '../db';
import type { AudioFile } from '../types';
import FileUpload from '../components/FileUpload.vue';
import { liveQuery, type Subscription } from 'dexie';

const router = useRouter(); 
const files = ref<AudioFile[]>([]);
const isLoading = ref(true);
let subscription: Subscription | null = null;

onMounted(async () => {
  console.log('Loading file');
  // Initial manual fetch to ensure data is visible immediately
  try {
    const initialFiles = await db.files.orderBy('uploadedAt').reverse().toArray();
    files.value = initialFiles;
  } catch (err) {
    console.error('Initial fetch failed:', err);
  } finally {
    isLoading.value = false;
  }

  // Subscribe to changes
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

const deleteFile = async (id: number) => {
  if (!confirm('Are you sure you want to delete this file?')) return;
  
  try {
    await db.transaction('rw', db.files, db.chunks, db.bookmarks, async () => {
      await db.files.delete(id);
      await db.chunks.where('fileId').equals(id).delete();
      await db.bookmarks.where('fileId').equals(id).delete();
    });
  } catch (error) {
    console.error('Failed to delete file:', error);
    alert('Error deleting file');
  }
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

      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading Library...</p>
      </div>

      <div v-else class="file-list">
        <!-- ... existing file list ... -->
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
          
          <button 
            class="delete-btn" 
            @click.stop="file.id && deleteFile(file.id)"
            title="Delete file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          
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
/* ... existing styles ... */

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #8E8E93;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #38383A;
  border-top-color: var(--app-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.home-page {
  padding: 20px;
  padding-bottom: 100px;
}

/* ... existing header h1 ... */

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

/* ... rest of existing styles ... */
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

.delete-btn {
  background: none;
  border: none;
  color: #8E8E93;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  z-index: 2;
}

.delete-btn:hover {
  background-color: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
}

.delete-btn:active {
  background-color: rgba(255, 59, 48, 0.2);
  color: #FF3B30;
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

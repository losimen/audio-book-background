<script setup lang="ts">
import { ref } from 'vue';
import { db } from '../db';
import type { AudioFile, FileChunk } from '../types';
import { CHUNK_SIZE_BYTES } from '../constants';
import { getStorageEstimate, isIOS, requestPersistentStorage, sleep } from '../utils';

const emit = defineEmits(['uploaded']);
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadStatus = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  
  if (!files || files.length === 0) return;

  const file = files[0];
  if (!file) return;
  
  isUploading.value = true;
  uploadProgress.value = 0;
  uploadStatus.value = 'Preparing...';

  let createdFileId: number | null = null;
  try {
    // Best-effort: make storage persistent so iOS is less likely to evict.
    await requestPersistentStorage();
    const { quota, usage } = await getStorageEstimate();
    if (quota != null && usage != null) {
      const remaining = quota - usage;
      if (file.size > remaining) {
        alert('Not enough storage available for this file (quota). Free space and try again.');
        return;
      }
    }

    const chunkCount = Math.ceil(file.size / CHUNK_SIZE_BYTES);
    
    // 1. Create the metadata record in IndexedDB
    uploadStatus.value = 'Creating record...';
    
    const newFile: Omit<AudioFile, 'id'> = {
      name: file.name,
      mimeType: file.type || 'audio/mpeg',
      fileSize: file.size,
      chunkCount,
      uploadedAt: new Date(),
      duration: 0,
      playbackPosition: 0
    };

    const fileId = await db.files.add(newFile);
    createdFileId = fileId as number;
    
    // 2. Save chunks in batches to avoid hundreds of tiny IDB transactions (slow + crashy on iOS).
    const BATCH_SIZE = 10;
    for (let base = 0; base < chunkCount; base += BATCH_SIZE) {
      const batch: FileChunk[] = [];
      const endIdx = Math.min(base + BATCH_SIZE, chunkCount);

      uploadStatus.value = `Saving… (${base + 1}-${endIdx} / ${chunkCount})`;

      for (let i = base; i < endIdx; i++) {
        const start = i * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
        const blobChunk = file.slice(start, end);

        // Safari iOS: IndexedDB Blob writes can fail; ArrayBuffer is more reliable.
        const data = isIOS() ? await blobChunk.arrayBuffer() : blobChunk;

        batch.push({
          fileId: createdFileId,
          index: i,
          data,
        });
      }

      await db.chunks.bulkAdd(batch);

      uploadProgress.value = Math.round((endIdx / chunkCount) * 100);

      // Yield so UI stays responsive and Safari gets breathing room.
      await sleep(0);
    }
    
    uploadStatus.value = 'Complete!';
    
    emit('uploaded');
    
    // Reset input
    if (fileInput.value) fileInput.value.value = '';
  } catch (error) {
    console.error('Upload failed:', error);
    // Cleanup partial state (common on iOS if the tab is killed mid-write)
    try {
      if (createdFileId != null) {
        const id = createdFileId;
        await db.transaction('rw', db.files, db.chunks, db.bookmarks, async () => {
          await db.files.delete(id);
          await db.chunks.where('fileId').equals(id).delete();
          await db.bookmarks.where('fileId').equals(id).delete();
        });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup failed:', cleanupErr);
    }
    alert('Failed to save file. Storage might be full or memory limit reached.');
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
    uploadStatus.value = '';
  }
};
</script>

<template>
  <div class="upload-container">
    <input 
      ref="fileInput"
      type="file" 
      accept="audio/*,video/*,.mp3,.wav,.m4a,.aac" 
      class="hidden-input"
      @change="handleFileChange"
    />
    
    <button class="upload-btn" @click="triggerUpload" :disabled="isUploading">
      <span v-if="isUploading && uploadProgress > 0">
        Saving... {{ uploadProgress }}%
      </span>
      <span v-else-if="isUploading">Reading file...</span>
      <span v-else>+ Upload Audio</span>
    </button>
    
    <div v-if="isUploading" class="progress-bar">
      <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.upload-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.hidden-input {
  display: none;
}

.upload-btn {
  background-color: var(--app-accent);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  width: 100%;
  max-width: 400px;
}

.upload-btn:active {
  opacity: 0.8;
}

.upload-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.progress-bar {
  width: 100%;
  max-width: 400px;
  height: 6px;
  background: #38383A;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--app-accent);
  transition: width 0.2s ease-out;
}
</style>


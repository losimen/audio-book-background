<script setup lang="ts">
import { ref } from 'vue';
import { db } from '../db';
import type { AudioFile, FileChunk } from '../db';

const emit = defineEmits(['uploaded']);
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadStatus = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

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

  try {
    const chunkCount = Math.ceil(file.size / CHUNK_SIZE);
    
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
    
    // 2. Fragment the file and save chunks one by one
    // This is the CRITICAL part for iOS memory stability
    for (let i = 0; i < chunkCount; i++) {
      uploadStatus.value = `Saving part ${i + 1} of ${chunkCount}...`;
      
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blobChunk = file.slice(start, end);
      
      // Convert chunk to ArrayBuffer
      const arrayBuffer = await blobChunk.arrayBuffer();
      
      const chunkRecord: FileChunk = {
        fileId: fileId as number,
        index: i,
        data: arrayBuffer
      };
      
      await db.chunks.add(chunkRecord);
      
      // Update progress
      uploadProgress.value = Math.round(((i + 1) / chunkCount) * 100);
    }
    
    uploadStatus.value = 'Complete!';
    
    emit('uploaded');
    
    // Reset input
    if (fileInput.value) fileInput.value.value = '';
  } catch (error) {
    console.error('Upload failed:', error);
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


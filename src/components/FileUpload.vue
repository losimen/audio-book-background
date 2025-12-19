<script setup lang="ts">
import { ref } from 'vue';
import { db } from '../db';
import type { AudioFile } from '../db';
import { saveFileToOPFS, isOPFSSupported } from '../opfs';

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
  
  // Check OPFS support
  if (!isOPFSSupported()) {
    alert('Your browser does not support the required storage API. Please use a modern browser.');
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  uploadStatus.value = 'Preparing...';

  try {
    // First, create the metadata record in IndexedDB to get an ID
    uploadStatus.value = 'Creating record...';
    
    const newFile: Omit<AudioFile, 'id'> = {
      name: file.name,
      mimeType: file.type || 'audio/mpeg',
      fileSize: file.size,
      uploadedAt: new Date(),
      duration: 0,
      playbackPosition: 0
    };

    const fileId = await db.files.add(newFile);
    
    // Now save the actual file data to OPFS (streams in chunks, no memory issues)
    uploadStatus.value = 'Saving audio...';
    
    await saveFileToOPFS(fileId as number, file, (progress) => {
      uploadProgress.value = progress;
    });
    
    uploadProgress.value = 100;
    uploadStatus.value = 'Complete!';
    
    emit('uploaded');
    
    // Reset input
    if (fileInput.value) fileInput.value.value = '';
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Failed to save file. Storage might be full.');
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


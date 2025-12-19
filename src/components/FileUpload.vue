<script setup lang="ts">
import { ref } from 'vue';
import { db } from '../db';
import type { AudioFile } from '../db';

const emit = defineEmits(['uploaded']);
const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  
  if (!files || files.length === 0) return;

  isUploading.value = true;
  const file = files[0];
  if (!file) {
      isUploading.value = false;
      return;
  }

  try {
    // Get duration (simplified, for better duration we need to load it into an audio element)
    // For now we just store it and let the player handle specific duration logic or update it later.
    const newFile: Omit<AudioFile, 'id'> = {
      name: file.name,
      blob: file,
      mimeType: file.type,
      uploadedAt: new Date(),
      duration: 0, // Placeholder, can be updated when playing
      playbackPosition: 0
    };

    await db.files.add(newFile);
    emit('uploaded');
    
    // Reset input
    if (fileInput.value) fileInput.value.value = '';
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Failed to save file. Storage might be full.');
  } finally {
    isUploading.value = false;
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
      <span v-if="isUploading">Saving...</span>
      <span v-else>+ Upload Audio</span>
    </button>
  </div>
</template>

<style scoped>
.upload-container {
  padding: 20px;
  display: flex;
  justify-content: center;
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
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

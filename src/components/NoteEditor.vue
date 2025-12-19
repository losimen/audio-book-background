<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
  initialText?: string;
  timeDisplay: string;
}>();

const emit = defineEmits(['save', 'close']);

const text = ref('');
const textarea = ref<HTMLTextAreaElement | null>(null);

onMounted(() => {
  text.value = props.initialText || '';
  // Auto-focus logic
  setTimeout(() => textarea.value?.focus(), 100);
});

const save = () => {
    emit('save', text.value);
};
</script>

<template>
  <div class="note-editor">
    <div class="header">
      <button class="cancel-btn" @click="$emit('close')">Cancel</button>
      <span class="timestamp">{{ timeDisplay }}</span>
      <button class="save-btn" @click="save">Save</button>
    </div>
    
    <div class="editor-container">
        <textarea 
            ref="textarea"
            v-model="text" 
            placeholder="Type your notes here..."
            class="editor-textarea"
        ></textarea>
    </div>
  </div>
</template>

<style scoped>
.note-editor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #000;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #1C1C1E;
  border-bottom: 1px solid #38383A;
}

.timestamp {
    font-weight: 600;
    font-size: 17px;
    font-variant-numeric: tabular-nums;
}

.cancel-btn, .save-btn {
    background: none;
    border: none;
    font-size: 17px;
    cursor: pointer;
}

.cancel-btn {
    color: #0A84FF;
}

.save-btn {
    color: #0A84FF;
    font-weight: 600;
}

.editor-container {
    flex: 1;
    padding: 20px;
}

.editor-textarea {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    color: white;
    font-size: 18px;
    font-family: 'Inter', sans-serif;
    resize: none;
    outline: none;
    line-height: 1.5;
}

.editor-textarea::placeholder {
    color: #555;
}
</style>

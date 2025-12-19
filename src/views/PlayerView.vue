<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { db } from '../db';
import type { AudioFile, Bookmark } from '../db';
import TimelineItem from '../components/TimelineItem.vue';
import NoteEditor from '../components/NoteEditor.vue';
import { liveQuery, type Subscription } from 'dexie';

const route = useRoute();
const router = useRouter();
const fileId = Number(route.params.id);

// --- State ---
const audioPlayer = ref<HTMLAudioElement | null>(null);
const fileData = ref<AudioFile | null>(null);
const audioUrl = ref<string | null>(null);

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const lastSavedTime = ref(0);
let autoSaveInterval: number | null = null;

// Bookmarks
const bookmarks = ref<Bookmark[]>([]);
let bookmarksSub: Subscription | null = null;
const isEditorOpen = ref(false);
const editingBookmark = ref<Bookmark | null>(null);

// --- Helpers ---
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- Audio Logic ---
const togglePlay = () => {
    if (!audioPlayer.value) return;
    if (audioPlayer.value.paused) {
        audioPlayer.value.play().catch(console.error);
    } else {
        audioPlayer.value.pause();
    }
};

const skip = (seconds: number) => {
    if (!audioPlayer.value) return;
    audioPlayer.value.currentTime = Math.max(0, Math.min(audioPlayer.value.currentTime + seconds, duration.value));
};

const jumpTo = (time: number) => {
    if (!audioPlayer.value) return;
    audioPlayer.value.currentTime = time;
    if (!isPlaying.value) audioPlayer.value.play();
};

const onTimeUpdate = () => {
    if (!audioPlayer.value) return;
    currentTime.value = audioPlayer.value.currentTime;
};

const onLoadedMetadata = () => {
     if (!audioPlayer.value || !fileData.value) return;
     duration.value = audioPlayer.value.duration;
     
     // Resume logic
     let startPos = fileData.value.playbackPosition || 0;
     lastSavedTime.value = startPos;
     
     if (startPos > 10) startPos -= 10;
     audioPlayer.value.currentTime = startPos;
     
     initMediaSession();
};

const onPlay = () => isPlaying.value = true;
const onPause = () => {
    isPlaying.value = false;
    saveProgress();
};

const seek = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const time = Number(target.value);
    if (audioPlayer.value) {
        audioPlayer.value.currentTime = time;
    }
};

const saveProgress = async () => {
    if (!audioPlayer.value) return;
    try {
        const time = audioPlayer.value.currentTime;
        await db.files.update(fileId, {
            playbackPosition: time,
            lastPlayedAt: new Date()
        });
        lastSavedTime.value = time;
    } catch (e) { console.error(e); }
};

// --- Bookmarks Logic ---
const addBookmark = async () => {
    if (!audioPlayer.value) return;
    try {
        const time = audioPlayer.value.currentTime;
        await db.bookmarks.add({
            fileId,
            time,
            createdAt: new Date()
        });
    } catch (e) { console.error(e); }
};

const openEditor = (bookmark: Bookmark) => {
    editingBookmark.value = bookmark;
    isEditorOpen.value = true;
};

const saveNote = async (text: string) => {
    if (editingBookmark.value && editingBookmark.value.id) {
        await db.bookmarks.update(editingBookmark.value.id, { text });
    }
    isEditorOpen.value = false;
    editingBookmark.value = null;
};

// --- Lifecycle ---
onMounted(async () => {
    // Load File
    const file = await db.files.get(fileId);
    if (!file) {
        router.push('/');
        return;
    }
    fileData.value = file;
    audioUrl.value = URL.createObjectURL(fileData.value.blob);
    
    if (file.playbackPosition) {
        lastSavedTime.value = file.playbackPosition;
    }

    // Subscribe to Bookmarks
    bookmarksSub = liveQuery(
        () => db.bookmarks.where('fileId').equals(fileId).sortBy('time')
    ).subscribe(result => bookmarks.value = result);
    
    // Auto-save every 5 seconds
    autoSaveInterval = window.setInterval(() => {
        if (isPlaying.value) {
            saveProgress();
        }
    }, 5000);
});

onUnmounted(() => {
    saveProgress();
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value);
    if (bookmarksSub) bookmarksSub.unsubscribe();
    if (autoSaveInterval) clearInterval(autoSaveInterval);
});

const goBack = () => {
    saveProgress();
    router.back();
};

const initMediaSession = () => {
     if ('mediaSession' in navigator && fileData.value) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: fileData.value.name,
            artist: 'Audio Listener',
             artwork: [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => audioPlayer.value?.play());
        navigator.mediaSession.setActionHandler('pause', () => audioPlayer.value?.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => skip(-10));
        navigator.mediaSession.setActionHandler('seekforward', () => skip(10));
    }
};
</script>

<template>
  <div class="player-page">
    <div class="header">
        <button class="icon-btn" @click="goBack">
            <span class="chevron">‹</span> Back
        </button>
    </div>

    <!-- Scrollable Content -->
    <div class="scroll-container">
        
        <!-- Info -->
        <div class="info-area" v-if="fileData">
            <h2 class="title">{{ fileData.name }}</h2>
        </div>

        <!-- Sticky Player Controls -->
        <div class="player-controls-wrapper">
             <audio 
                ref="audioPlayer"
                :src="audioUrl || undefined"
                @timeupdate="onTimeUpdate"
                @loadedmetadata="onLoadedMetadata"
                @play="onPlay" 
                @pause="onPause"
                @ended="onPause"
                preload="metadata"
            ></audio>

             <!-- Progress Area -->
             <div class="progress-area">
                 <div class="slider-box">
                    <input 
                        type="range" 
                        min="0" :max="duration" 
                        :value="currentTime" 
                        @input="seek"
                        class="seek-slider"
                    >
                 </div>
                 
                 <div class="time-display">
                    <span>{{ formatTime(currentTime) }}</span>
                    <span>{{ formatTime(duration) }}</span>
                </div>
             </div>

             <!-- Transport Controls -->
             <div class="transport-controls">
                <button class="skip-btn" @click="skip(-10)">-10s</button>
                <button class="play-btn" @click="togglePlay">
                    <span v-if="isPlaying">⏸</span>
                    <span v-else>▶</span>
                </button>
                <button class="skip-btn" @click="skip(10)">+10s</button>
             </div>
             
             <!-- Primary Action: Save Timeline -->
             <div class="action-row">
                 <button class="save-timeline-btn" @click="addBookmark">
                     Save Timeline
                 </button>
             </div>
        </div>

        <!-- Timeline List -->
        <div class="timeline-list">
            <h3 class="list-title" v-if="bookmarks.length > 0">Timelines</h3>
            
            <!-- Last Listened Button -->
            <div class="last-listened-card" @click="jumpTo(lastSavedTime)">
                <div class="last-listened-content">
                    <span class="last-listened-label">Last Saved Checkpoint</span>
                    <span class="last-listened-time">{{ formatTime(lastSavedTime) }}</span>
                </div>
                <div class="last-listened-icon">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                     </svg>
                </div>
            </div>

            <TimelineItem 
                v-for="b in bookmarks" 
                :key="b.id" 
                :bookmark="b"
                @jump="jumpTo"
                @edit="openEditor"
            />
            
            <div class="empty-list-pad" v-if="bookmarks.length === 0">
                <p>Tap "Save Timeline" to mark interesting moments.</p>
            </div>
        </div>
    </div>

    <!-- Note Editor Modal -->
    <NoteEditor 
        v-if="isEditorOpen && editingBookmark"
        :initial-text="editingBookmark.text"
        :time-display="formatTime(editingBookmark.time)"
        @save="saveNote"
        @close="isEditorOpen = false"
    />
  </div>
</template>

<style scoped>
.player-page {
  height: 100vh;
  background-color: var(--app-bg);
  color: var(--app-text);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent body scroll */
}

.header {
  padding: 16px 20px;
  flex-shrink: 0;
  z-index: 10;
  background: var(--app-bg); /* Opaque header */
}

.icon-btn {
  background: none;
  border: none;
  color: var(--app-accent);
  font-size: 17px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
}

.chevron {
  font-size: 24px;
  margin-right: 4px;
  margin-top: -2px;
}

.scroll-container {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px 40px 20px;
    display: flex;
    flex-direction: column;
}

.info-area {
  margin: 10px 0 30px 0;
  text-align: center;
}

.title {
  font-size: 22px;
  font-weight: 700; /* Bolder */
  margin: 0;
  line-height: 1.3;
}

.progress-area {
    margin-bottom: 24px;
    position: relative;
    min-height: 80px; /* Space for Wave/Slider */
    display: flex;
    flex-direction: column;
    justify-content: center;
}

/* Common box for slider/waveform padding/layout */
.slider-box, .waveform-box {
    width: 100%;
    /* The user asked for padding on input. */
    padding: 0 10px; 
    box-sizing: border-box;
}

.wave-container {
    width: 100%;
}

.seek-slider {
    -webkit-appearance: none;
    width: 100%;
    height: 60px; /* Taller hit area */
    background: transparent;
    outline: none;
    position: relative;
    margin: 0;
}

/* Track line */
.seek-slider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 4px;
    background: #38383A;
    border-radius: 2px;
    transform: translateY(-50%);
    pointer-events: none; /* Let clicks pass to input */
}

/* Thumb */
.seek-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px; /* Larger thumb */
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    position: relative;
    z-index: 2; /* On top of track */
    margin-top: -8px; /* Center alignment adjustment for Webkit if needed, or flex handles it */
}
/* Adjust thumb margin to center on the 4px track. 
   If track is simulated via ::before centered, custom thumb needs strict alignment. 
   Simpler approach: style the track directly on input but give it transparent borders to increase hit area? 
   Let's stick to simple first. */
.seek-slider::-webkit-slider-runnable-track {
    height: 4px;
    background: #38383A;
    border-radius: 2px;
}
.seek-slider::-webkit-slider-thumb {
    margin-top: -8px; /* (4px track - 20px thumb) / 2 */
}

.time-display {
  display: flex;
  justify-content: space-between;
  color: #8E8E93;
  font-size: 13px;
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
  padding: 0 4px;
}

.transport-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 50px;
  margin-bottom: 30px;
}

.play-btn {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: white;
  color: black;
  border: none;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding-left: 4px; 
}

.play-btn:active {
    transform: scale(0.95);
    opacity: 0.9;
}

.skip-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  padding: 10px;
}

.action-row {
    display: flex;
    justify-content: center;
    margin-bottom: 40px;
}

.save-timeline-btn {
    background-color: #1C1C1E; /* Dark grey like Stopwatch Lap button */
    border: 1px solid #38383A;
    color: #fff;
    padding: 14px 28px;
    border-radius: 30px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    min-width: 160px;
}

.save-timeline-btn:active {
    background-color: #2C2C2E;
}

.timeline-list {
    margin-top: 10px;
}

.list-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #E5E5EA;
}

.empty-list-pad {
    text-align: center;
    color: #636366;
    padding: 40px 0;
}

.last-listened-card {
    background: #2C2C2E;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    border: 1px solid #0A84FF; /* Highlight it */
    box-shadow: 0 4px 12px rgba(10, 132, 255, 0.15);
}

.last-listened-card:active {
    opacity: 0.8;
    transform: scale(0.98);
    transition: transform 0.1s;
}

.last-listened-content {
    display: flex;
    flex-direction: column;
}

.last-listened-label {
    font-size: 13px;
    text-transform: uppercase;
    color: #0A84FF;
    font-weight: 600;
    margin-bottom: 4px;
    letter-spacing: 0.5px;
}

.last-listened-time {
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #fff;
}

.last-listened-icon {
    color: #0A84FF;
}
</style>

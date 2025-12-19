// Origin Private File System (OPFS) storage for large audio files
// This avoids memory issues that occur with IndexedDB blob storage on iOS

const AUDIO_FOLDER = 'audio-files';

// Check if OPFS is supported
export const isOPFSSupported = (): boolean => {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
};

// Get or create the audio files directory
async function getAudioDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(AUDIO_FOLDER, { create: true });
}

// Generate a unique filename for storage
export function generateStorageFileName(fileId: number): string {
  return `audio_${fileId}`;
}

// Save a file to OPFS using streaming (doesn't load entire file into memory)
export async function saveFileToOPFS(
  fileId: number,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (!isOPFSSupported()) {
    throw new Error('OPFS is not supported in this browser');
  }

  const audioDir = await getAudioDirectory();
  const fileName = generateStorageFileName(fileId);
  
  // Create a new file handle
  const fileHandle = await audioDir.getFileHandle(fileName, { create: true });
  
  // Get a writable stream
  const writable = await fileHandle.createWritable();
  
  try {
    // Stream the file in chunks to avoid memory issues
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalSize = file.size;
    let offset = 0;
    
    while (offset < totalSize) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunk.arrayBuffer();
      await writable.write(buffer);
      
      offset += buffer.byteLength;
      
      if (onProgress) {
        onProgress(Math.round((offset / totalSize) * 100));
      }
    }
  } finally {
    await writable.close();
  }
}

// Read a file from OPFS and return a URL for playback
export async function getFileUrlFromOPFS(fileId: number): Promise<string | null> {
  if (!isOPFSSupported()) {
    return null;
  }

  try {
    const audioDir = await getAudioDirectory();
    const fileName = generateStorageFileName(fileId);
    
    const fileHandle = await audioDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    
    return URL.createObjectURL(file);
  } catch (e) {
    // File doesn't exist
    console.error('Failed to get file from OPFS:', e);
    return null;
  }
}

// Check if a file exists in OPFS
export async function fileExistsInOPFS(fileId: number): Promise<boolean> {
  if (!isOPFSSupported()) {
    return false;
  }

  try {
    const audioDir = await getAudioDirectory();
    const fileName = generateStorageFileName(fileId);
    await audioDir.getFileHandle(fileName);
    return true;
  } catch {
    return false;
  }
}

// Delete a file from OPFS
export async function deleteFileFromOPFS(fileId: number): Promise<void> {
  if (!isOPFSSupported()) {
    return;
  }

  try {
    const audioDir = await getAudioDirectory();
    const fileName = generateStorageFileName(fileId);
    await audioDir.removeEntry(fileName);
  } catch (e) {
    console.error('Failed to delete file from OPFS:', e);
  }
}

// Get file info from OPFS
export async function getFileInfoFromOPFS(fileId: number): Promise<{ size: number; type: string } | null> {
  if (!isOPFSSupported()) {
    return null;
  }

  try {
    const audioDir = await getAudioDirectory();
    const fileName = generateStorageFileName(fileId);
    
    const fileHandle = await audioDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    
    return {
      size: file.size,
      type: file.type
    };
  } catch {
    return null;
  }
}

export interface AudioFile {
  id?: number;
  name: string;
  mimeType: string;
  fileSize: number; // bytes
  chunkCount: number; // number of chunks
  uploadedAt: Date;
  duration: number; // seconds
  lastPlayedAt?: Date;
  playbackPosition: number; // seconds
}

export type ChunkData = Blob | ArrayBuffer;

export interface FileChunk {
  id?: number;
  fileId: number;
  index: number;
  data: ChunkData;
}

export interface Bookmark {
  id?: number;
  fileId: number;
  time: number;
  text?: string;
  createdAt: Date;
}



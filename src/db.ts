import Dexie, { type Table } from 'dexie';

export interface AudioFile {
  id?: number;
  name: string;
  // Audio data is now stored in OPFS (Origin Private File System)
  // for better performance with large files on iOS
  // The file can be retrieved using the id: opfs.getFileUrlFromOPFS(id)
  mimeType: string;
  fileSize: number; // in bytes
  uploadedAt: Date;
  duration: number; // in seconds
  lastPlayedAt?: Date;
  playbackPosition: number; // in seconds
}

export interface Bookmark {
  id?: number;
  fileId: number;
  time: number;
  text?: string;
  createdAt: Date;
}

export class AudioDatabase extends Dexie {
  files!: Table<AudioFile>;
  bookmarks!: Table<Bookmark>;

  constructor() {
    super('AudioBackgroundListenerDB');
    
    // Version 4: Audio data moved to OPFS, only metadata in IndexedDB
    this.version(4).stores({
      files: '++id, name, uploadedAt, lastPlayedAt',
      bookmarks: '++id, fileId, time'
    });
    
    // Keep old versions for migration path
    this.version(3).stores({
      files: '++id, name, uploadedAt, lastPlayedAt',
      bookmarks: '++id, fileId, time'
    });
    
    this.version(2).stores({
      files: '++id, name, uploadedAt, lastPlayedAt',
      bookmarks: '++id, fileId, time'
    });
  }
}

export const db = new AudioDatabase();



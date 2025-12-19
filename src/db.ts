import Dexie, { type Table } from 'dexie';
import type { AudioFile, Bookmark, FileChunk } from './types';

export class AudioDatabase extends Dexie {
  files!: Table<AudioFile>;
  chunks!: Table<FileChunk>;
  bookmarks!: Table<Bookmark>;

  constructor() {
    super('AudioBackgroundListenerDB');
    
    // Version 5: Chunked storage to handle 300MB+ files on iOS Safari
    this.version(5).stores({
      files: '++id, name, uploadedAt, lastPlayedAt',
      chunks: '++id, fileId, index', // Added chunks table
      bookmarks: '++id, fileId, time'
    });
    
    // Previous versions for migration
    this.version(4).stores({
      files: '++id, name, uploadedAt, lastPlayedAt',
      bookmarks: '++id, fileId, time'
    });
    
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



import Dexie, { type Table } from 'dexie';

export interface AudioFile {
  id?: number;
  name: string;
  blob: Blob;
  mimeType: string;
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
    this.version(2).stores({
      files: '++id, name, uploadedAt, lastPlayedAt',
      bookmarks: '++id, fileId, time'
    });
    // Keep version 1 for backward compatibility if needed, but Dexie handles upgrades well usually
    // If this is a fresh dev environment, version 1 is fine to plain overwrite or use version 2
  }
}

export const db = new AudioDatabase();

import Dexie, { type Table } from 'dexie'
import type { Song } from '@/types'

class LyricsDB extends Dexie {
  songs!: Table<Song>

  constructor() {
    super('LyricsDB')
    this.version(1).stores({
      songs: '++id, title, artist, language, createdAt, updatedAt',
    })
    this.version(2).stores({
      songs: '++id, title, artist, language, createdAt, updatedAt, movie, year, musicDirector, lyricist',
    })
  }
}

export const db = new LyricsDB()

import Dexie, { type Table } from 'dexie'
import type { Song } from '@/types'

class LyricsDB extends Dexie {
  songs!: Table<Song>

  constructor() {
    super('LyricsDB')
    this.version(1).stores({
      songs: '++id, title, artist, language, createdAt, updatedAt',
    })
  }
}

export const db = new LyricsDB()

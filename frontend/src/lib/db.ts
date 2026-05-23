import Dexie, { Table } from 'dexie';

export interface CachedMedia {
  id: string;
  user_id: string;
  file_hash: string;
  thumbnail_path: string | null;
  mime_type: string;
  capture_date: string | null;
  created_at: string;
}

class ArcaDB extends Dexie {
  media!: Table<CachedMedia, string>;

  constructor() {
    super('arca');
    this.version(1).stores({
      media: 'id, user_id, capture_date, created_at',
    });
  }
}

export const db = new ArcaDB();

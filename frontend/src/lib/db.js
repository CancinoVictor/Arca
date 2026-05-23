import Dexie from 'dexie';
class ArcaDB extends Dexie {
    media;
    constructor() {
        super('arca');
        this.version(1).stores({
            media: 'id, user_id, capture_date, created_at',
        });
    }
}
export const db = new ArcaDB();

import Dexie from 'Dexie';

export const db = new Dexie("FlowerEvolver");
db.version(1).stores({
    flowers: '++id', // genome and image are not to be indexed
    mutations:'id, original',
    descendants:'id, father, mother',
    favourites:'id'
});

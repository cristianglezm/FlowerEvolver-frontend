import Dexie from 'dexie';

export const db = new Dexie("FlowerEvolver");
db.version(1).stores({
    flowers: '++id', // genome and image are not to be indexed
    mutations:'id, original',
    descendants:'id, father, mother',
    favourites:', &id',
    descriptions: 'id, description'
});
db.version(2).stores({
    species: 'id, fp, [x+y]', // id is the flower id, derived from the flower genome and the classifier
    classifier: 'id' // the fine-tuned classifier ('tuned') and the sub-species maps ('sub:fp:x,y')
});

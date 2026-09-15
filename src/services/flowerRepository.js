import { db } from '../stores/FlowerStore/db';

export function ensureOpen(){
	if(!db.isOpen()){
		return db.open();
	}
}

export async function countFlowers(){
	return db.flowers.count();
}
export async function addFlower(flower){
	return db.flowers.add(flower);
}
export async function getFlower(id){
	return db.flowers.get(id);
}
export async function bulkGetFlowers(ids){
	return db.flowers.bulkGet(ids);
}
export async function bulkAddFlowers(flowers){
	return db.flowers.bulkAdd(flowers);
}
export async function deleteFlower(id){
	return db.flowers.delete(id);
}
export async function listFlowers({limit, offset}){
	return db.flowers.reverse().offset(offset).limit(limit).toArray();
}

export async function countFavourites(){
	return db.favourites.count();
}
export async function isFavourited(id){
	const rows = await db.favourites.where(':id').equals(id).toArray();
	return rows.length > 0;
}
export async function addFavourite(id){
	return db.favourites.add(id, id);
}
export async function removeFavourite(id){
	return db.favourites.delete(id);
}
export async function listFavouriteIds(){
	return db.favourites.toArray();
}
export async function bulkAddFavourites(ids){
	return db.favourites.bulkAdd(ids, ids);
}

export async function countMutations(original){
	if(original === undefined || original === null){
		return db.mutations.count();
	}
	return db.mutations.where('original').equals(original).count();
}
export async function addMutation(entry){
	return db.mutations.add(entry);
}
export async function listMutationsByOriginal({original, limit, offset}){
	return db.mutations.where('original').equals(original)
		.offset(offset).limit(limit).reverse().toArray();
}
export async function findMutationsByOriginalOrId(id){
	return db.mutations.where('original').equals(id).or(':id').equals(id).toArray();
}
export async function bulkDeleteMutations(ids){
	return db.mutations.bulkDelete(ids);
}

export async function countDescendantsByParent(fatherID){
	return db.descendants.where('father').equals(fatherID).or('mother').equals(fatherID).count();
}
export async function countDescendantsByParents(fatherID, motherID){
	return db.descendants.where('father').equals(fatherID).and(d => d.mother == motherID).count();
}
export async function addDescendant(entry){
	return db.descendants.add(entry);
}
export async function listDescendantsByParent({fatherID, limit, offset}){
	const rows = await db.descendants.where('father').equals(fatherID).or('mother').equals(fatherID).sortBy('id');
	return rows.reverse().slice(offset, offset + limit);
}
export async function listDescendantsByParents({fatherID, motherID, limit, offset}){
	return db.descendants.where('father').equals(fatherID).and(ds => ds.mother == motherID)
		.offset(offset).limit(limit).reverse().toArray();
}
export async function deleteDescendant(id){
	return db.descendants.delete(id);
}

export async function addDescription(desc){
	return db.descriptions.add(desc);
}
export async function listDescriptions({limit, offset}){
	return db.descriptions.offset(offset).limit(limit).toArray();
}
export async function bulkGetDescriptions(ids){
	return db.descriptions.bulkGet(ids);
}
export async function deleteDescription(id){
	return db.descriptions.delete(id);
}
export async function bulkAddDescriptions(descs){
	return db.descriptions.bulkAdd(descs);
}

export async function wipeDatabase(){
	await db.delete();
	db.open();
}

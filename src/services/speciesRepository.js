import { db } from '../stores/FlowerStore/db';

/**
 * A species row is { id, x, y, d, fp } where id is the flower id, (x, y) the cell of the
 * classifier grid, d the distance to that cell's prototype and fp the fingerprint of the
 * classifier that produced it. A row is only current while fp matches the classifier in use.
 * x, y and d are null for a flower that could not be classified.
 * Once a species is split the row also has { sx, sy, sfp }, the cell of the sub-species map.
 */
export async function getSpecies(id){
	return db.species.get(id);
}
export async function bulkGetSpecies(ids){
	return db.species.bulkGet(ids);
}
export async function bulkPutSpecies(rows){
	return db.species.bulkPut(rows);
}
export async function deleteSpecies(id){
	return db.species.delete(id);
}
export async function listCurrent(fp){
	return db.species.where('fp').equals(fp).toArray();
}

// The filters go before offset/limit on purpose: Dexie applies them in the order they are added,
// so the offset only counts rows that are current.
function currentInCell({x, y, fp, sub}){
	return db.species.where('[x+y]').equals([x, y])
		.and(r => r.fp === fp && (!sub || (r.sfp === sub.fp && r.sx === sub.x && r.sy === sub.y)));
}
export async function countByCell({x, y, fp, sub}){
	return currentInCell({x, y, fp, sub}).count();
}
export async function listFlowerIdsByCell({x, y, fp, sub, limit, offset}){
	return currentInCell({x, y, fp, sub}).offset(offset).limit(limit).reverse().primaryKeys();
}

/**
 * The classifier table holds { id: 'tuned', json } and the sub-species maps
 * { id: 'sub:{fp}:{x},{y}', json, ... } where fp is the fingerprint of the classifier the map belongs to.
 */
export async function getClassifier(id){
	return db.classifier.get(id);
}
export async function putClassifier(record){
	return db.classifier.put(record);
}
export async function deleteClassifier(id){
	return db.classifier.delete(id);
}
export async function clearClassifier(){
	return db.classifier.clear();
}
export async function listSubmaps(fp){
	return db.classifier.where('id').startsWith(`sub:${fp}:`).toArray();
}
/** @brief Every flower id (not a page) of a species of the classifier fp. */
export async function listAllFlowerIdsByCell({x, y, fp}){
	return currentInCell({x, y, fp}).primaryKeys();
}
/**
 * @brief The current rows of a species that are not placed by the sub-species map subfp yet:
 * flowers made after the split, or placed by a map that is not there anymore.
 */
export async function listRowsWithoutSub({x, y, fp, subfp}){
	return currentInCell({x, y, fp}).and(r => r.sfp !== subfp).toArray();
}
/** @brief Deletes the sub-species maps of every classifier. */
export async function clearSubmaps(){
	return db.classifier.where('id').startsWith('sub:').delete();
}
/**
 * @brief Takes sx, sy and sfp off the rows of one species ({ x, y }), or off all the rows when there is no cell.
 */
export async function clearSubRows(cell){
	const strip = (row) => {
		delete row.sx;
		delete row.sy;
		delete row.sfp;
	};
	if(cell){
		return db.species.where('[x+y]').equals([cell.x, cell.y]).modify(strip);
	}
	return db.species.filter(r => r.sfp !== undefined).modify(strip);
}
/** @brief How many flowers of the species are in each sub-species placed by the map subfp: "sx,sy" to a number. */
export async function countSubCells({x, y, fp, subfp}){
	const counts = new Map();
	await currentInCell({x, y, fp}).and(r => r.sfp === subfp && r.sx !== null).each((row) => {
		const key = `${row.sx},${row.sy}`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	});
	return counts;
}

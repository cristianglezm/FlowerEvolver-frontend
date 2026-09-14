import axios from 'axios';

export const API = import.meta.env.VITE_APP_API_URL;

/**
 * Maps an axios error to a user-facing message.
 * If the backend responded with an error body, surface that; otherwise assume
 * the server is unreachable and fall back to the caller-supplied offline message.
 */
export function mapAxiosError(error, offlineMessage){
	if(error.response === undefined){
		return offlineMessage;
	}
	return error.response.data;
}

export async function getFlowersCount(){
	const response = await axios.get(API + 'flowers?count=1');
	return response.data.count;
}

export async function getFlowers({limit, offset}){
	const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset);
	return response.data.flowers;
}

export async function createFlower(){
	const response = await axios.post(API + 'flowers', {}, {
		headers: {
			'Content-Type': 'application/json'
		}
	});
	return response.data;
}

export async function shareFlower(genome){
	await axios.post(API + 'flowers', genome, {
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

export async function reproduceRemote(fatherID, motherID){
	const response = await axios.post(API + 'ancestors', { father: fatherID, mother: motherID });
	return response.data;
}

export async function getMutationsCount(original){
	if(original === undefined || original === null){
		const response = await axios.get(API + 'mutations?count=1');
		return response.data.count;
	}
	const response = await axios.get(API + 'mutations/' + original + '?count=1');
	return response.data.count;
}

export async function getMutations(flowerID, {limit, offset}){
	const response = await axios.get(API + 'mutations/' + flowerID + '?limit=' + limit + '&offset=' + offset);
	return response.data;
}

export async function mutateRemote(original){
	const response = await axios.post(API + 'mutations', { original });
	return response.data;
}

export async function getAncestorsCount(fatherID, motherID){
	if(motherID === undefined || motherID === null){
		const response = await axios.get(API + 'ancestors/' + fatherID + '?count=1');
		return response.data.count;
	}
	const response = await axios.get(API + 'ancestors/' + fatherID + '/' + motherID + '?count=1');
	return response.data.count;
}

export async function getAncestors(flower1ID, flower2ID, {limit, offset}){
	if(flower2ID === undefined || flower2ID === null){
		const response = await axios.get(API + 'ancestors/' + flower1ID + '?limit=' + limit + '&offset=' + offset);
		return response.data;
	}
	const response = await axios.get(API + 'ancestors/' + flower1ID + '/' + flower2ID + '?limit=' + limit + '&offset=' + offset);
	return response.data;
}

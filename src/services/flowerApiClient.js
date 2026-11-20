export const API = import.meta.env.VITE_APP_API_URL;

/**
 * The server answered, and said that it could not do what was asked: its status and what it said.
 * A request that gets no answer at all (the server is off, no network) is not this one: it is the error of `fetch`.
 */
export class ApiError extends Error{
	constructor(status, data){
		super(typeof data === 'string' && data !== '' ? data : 'the server answered ' + status);
		this.name = 'ApiError';
		this.status = status;
		this.data = data;
	}
}

/**
 * Maps the failure of a request to a message for the person.
 * If the server answered with an error, say what it said; otherwise assume the server cannot be reached and fall
 * back to the message of the caller.
 */
export function describeError(error, offlineMessage){
	if(error instanceof ApiError){
		return error.data;
	}
	return offlineMessage;
}

// What the server says is JSON, or a plain text when it is an error.
const readBody = async (response) => {
	const text = await response.text();
	try{
		return JSON.parse(text);
	}catch{
		return text;
	}
};

const request = async (method, path, body) => {
	const options = { method };
	if(body !== undefined){
		options.headers = { 'Content-Type': 'application/json' };
		options.body = typeof body === 'string' ? body : JSON.stringify(body);
	}
	const response = await fetch(API + path, options);
	const data = await readBody(response);
	if(!response.ok){
		throw new ApiError(response.status, data);
	}
	return data;
};

export async function getFlowersCount(){
	return (await request('GET', 'flowers?count=1')).count;
}

export async function getFlowers({limit, offset}){
	return (await request('GET', 'flowers?limit=' + limit + '&offset=' + offset)).flowers;
}

export async function createFlower(){
	return await request('POST', 'flowers', {});
}

export async function shareFlower(genome){
	await request('POST', 'flowers', genome);
}

export async function reproduceRemote(fatherID, motherID){
	return await request('POST', 'descendants', { father: fatherID, mother: motherID });
}

export async function getMutationsCount(original){
	if(original === undefined || original === null){
		return (await request('GET', 'mutations?count=1')).count;
	}
	return (await request('GET', 'mutations/' + original + '?count=1')).count;
}

export async function getMutations(flowerID, {limit, offset}){
	return await request('GET', 'mutations/' + flowerID + '?limit=' + limit + '&offset=' + offset);
}

export async function mutateRemote(original){
	return await request('POST', 'mutations', { original });
}

export async function getDescendantsCount(fatherID, motherID){
	if(motherID === undefined || motherID === null){
		return (await request('GET', 'descendants/' + fatherID + '?count=1')).count;
	}
	return (await request('GET', 'descendants/' + fatherID + '/' + motherID + '?count=1')).count;
}

export async function getDescendants(flower1ID, flower2ID, {limit, offset}){
	if(flower2ID === undefined || flower2ID === null){
		return await request('GET', 'descendants/' + flower1ID + '?limit=' + limit + '&offset=' + offset);
	}
	return await request('GET', 'descendants/' + flower1ID + '/' + flower2ID + '?limit=' + limit + '&offset=' + offset);
}

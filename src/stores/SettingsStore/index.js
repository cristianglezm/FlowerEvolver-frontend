import { defineStore } from 'pinia';

export const STORAGE_KEY = 'FlowerEvolverSettings';

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// A new one each time: what a store changes must not be what the next one starts with.
const defaultSettings = () => ({
	params: { radius:64, numLayers:3, P: 6.0, bias: 1.0 },
	mutationRates: { addNodeRate: 0.2, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0.35, disableRate: 0.3, actTypeRate: 0.4 },
	loadDemoFlowers: true,
	loadCaptionerModel: false,
	loadChatBotModel: false,
	loadKokoroModel: false,
	showChatBot: false,
	pagination: false,
	limit: 100,
	magnification: 4
});

// What was saved wins, and what an older save does not have is the default: a key that a later version
// added would be undefined otherwise. What cannot be read, or is not an object, is the defaults.
const loadSettings = () => {
	const settings = defaultSettings();
	let saved;
	try{
		saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
	}catch{
		return settings;
	}
	if(!isObject(saved)){
		return settings;
	}
	for(const [key, value] of Object.entries(saved)){
		if(isObject(settings[key])){
			if(isObject(value)){
				settings[key] = { ...settings[key], ...value };
			}
		}else{
			settings[key] = value;
		}
	}
	return settings;
};

export const useSettingsStore = defineStore('SettingsStore', {
	state: () => ({
		settings: loadSettings(),
	}),
	actions: {
		increaseOffset(offset){
			return offset + this.settings.limit;
		},
		calcOffset(page){
			return page * this.settings.limit;
		},
		async setLoadDemoFlowers(load){
			this.settings.loadDemoFlowers = load;
			this.saveSettings();
		},
		// The params that the flowers that are made, reproduced or mutated have. What they are limited to is for the wasm to say.
		setCreationParams({ radius, numLayers, P, bias }){
			this.settings.params = { radius, numLayers, P, bias };
			this.saveSettings();
		},
		async saveSettings(){
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
		},
	}
});

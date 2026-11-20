import { defineStore } from 'pinia';

export const STORAGE_KEY = 'FlowerEvolverSettings';

export const useSettingsStore = defineStore('SettingsStore', {
	state: () => ({
		settings: JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify({
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
		})),
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
		async saveSettings(){
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
		},
	}
});

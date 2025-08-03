<template>
  <div class="stats-container">
    <div class="sIcon" @click="toggle()">
      S
    </div>
    <div v-if="showing">
      <FloatingPanel :loc="'bottom'" :match-parent-width="false">
        <div class="StatsPanel">
          <div class="header">
            <h2>Stats</h2>
            <span class="close" @click="close()">×</span>
          </div>
          <p>Health: {{ props.stats.health }}</p>
          <p>Stamina: {{ props.stats.stamina }}</p>
          <p>Temperature Range: {{ props.stats.minTemperature }}°C to {{ props.stats.maxTemperature }}°C</p>
          <p>Maturation Period: {{ props.stats.maturationPeriod }} day/s</p>
          <p>Sex: <span class="capitalize">{{ props.stats.sex }}</span></p>
          <p>Toxicity Rate: {{ props.stats.toxicityRate.toFixed(2) }}</p>
          <h3 class="effects-title">Effects</h3>
          <div class="effects-grid">
            <p>Vitality: <span>{{ props.stats.effects.vitality.toFixed(2) }}</span></p>
            <p>Agility: <span>{{ props.stats.effects.agility.toFixed(2) }}</span></p>
            <p>Intelligence: <span>{{ props.stats.effects.intelligence.toFixed(2) }}</span></p>
            <p>Strength: <span>{{ props.stats.effects.strength.toFixed(2) }}</span></p>
            <p>Luck: <span>{{ props.stats.effects.luck.toFixed(2) }}</span></p>
          </div>
        </div>
      </FloatingPanel>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FloatingPanel from './FloatingPanel.vue';

const props = defineProps({
  stats: {
    type: Object,
    required: true,
    validator: (value) => {
      return 'health' in value && 
             'stamina' in value && 
             'minTemperature' in value &&
             'maxTemperature' in value &&
             'maturationPeriod' in value &&
             'sex' in value &&
             'toxicityRate' in value &&
             'effects' in value &&
             'vitality' in value.effects &&
             'agility' in value.effects &&
             'intelligence' in value.effects &&
             'strength' in value.effects &&
             'luck' in value.effects;
    }
  }
});

const showing = ref(false);

const toggle = () => {
  showing.value = !showing.value;
};

const close = () => {
  showing.value = false;
};
</script>

<style scoped>
.stats-container{
  position: relative;
  display: inline-block;
}
.close{
  color: lightgreen;
  font-size: 1.8rem;
  font-weight: bold;
  cursor: pointer;
  line-height: 1;
}
.sIcon{
  background-color: green;
  border: solid lightgreen;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  cursor: pointer;
  color: lightgreen;
  font-weight: bold;
  user-select: none;
}
.StatsPanel{
  width: 250px;
  color: lightgreen;
  background-color: green;
  border: 1px solid lightgreen;
  border-radius: 1rem;
  padding: 0.8rem 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.header{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid lightgreen;
  padding-bottom: 0.5rem;
}
h2, h3{
  margin: 0;
  padding: 0;
  color: lightgreen;
}
.effects-title{
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 1.1em;
}
.effects-grid{
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}
.effects-grid p{
  display: flex;
  justify-content: space-between;
}
p{
  margin: 0.3rem 0;
  font-size: 0.9em;
}
.capitalize{
  text-transform: capitalize;
}
</style>
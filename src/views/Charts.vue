<template>
  <div>
    <div style="display: flex; flex-flow: column nowrap; gap: 2rem; color: lightgreen; background-color: rgb(37, 39, 41)">
      <Spinner v-if="loading" :message="'Loading Charts..'" />
      <div v-else>
        <h2>Creation Parameters</h2>
        <div :class="isMobile() ? 'dashboard-col' : 'dashboard-row'" class="center-grid">
          <VChart
            v-for="key in histKeys.slice(0,4)"
            :key="key"
            :option="chartOpts[key]"
            :style="{ width: layout.chartWidth, height: layout.largeChartHeight }"
          />
        </div>
        <h2>Stats</h2>
        <div class="dashboard-grid" :style="isMobile() ? 'padding: 20px;':'padding: 0px'">
          <VChart
            v-for="key in ['health','stamina']"
            :key="key"
            :option="chartOpts[key]"
            :style="{ width: layout.chartWidth, height: layout.chartHeight }"
          />
        </div>
        <div class="center-grid">
          <VChart
            :option="chartOpts.sex"
            :style="{ width: layout.sexChartWidth, height: layout.sexChartHeight }"
          />
        </div>
        <div class="dashboard-grid" :style="isMobile() ? 'padding: 20px;':'padding: 0px'">
          <VChart
            v-for="key in ['minTemp','maxTemp','maturation','toxicity']"
            :key="key"
            :option="chartOpts[key]"
            :style="{ width: layout.chartWidth, height: layout.chartHeight }"
          />
        </div>
        <h2>Effects</h2>
        <div class="dashboard-grid" :style="isMobile() ? 'padding: 20px;':'padding: 0px'">
          <VChart
            v-for="key in histKeys.slice(-5)"
            :key="key"
            :option="chartOpts[key]"
            :style="{ width: layout.chartWidth, height: layout.chartHeight }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useFlowerStore } from '../stores/FlowerStore';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components';
import Spinner from '../components/Spinner.vue';

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
]);

const FlowerStore = useFlowerStore();
const loading = ref(true);

const config = {
  textColor: 'lightgreen',
  bgColor: 'rgb(37, 39, 41)',
  figureColor: 'green',
  sexColors: ['lightgreen', 'green', 'lime'],
};

const layout = reactive({
  chartWidth: '500px',
  chartHeight: '240px',
  largeChartHeight: '250px',
  sexChartWidth: '500px',
  sexChartHeight: '350px',
});

const isMobile = () => {
  return window.innerWidth <= 1280;
};

const histKeys = [
  'radius', 'P', 'bias', 'numLayers', 'minTemp', 'maxTemp', 'maturation',
  'health', 'stamina', 'toxicity', 'vitality', 'agility', 'intelligence',
  'strength', 'luck',
];

const titles = {
  radius: 'Radius Distribution', P: 'Petal Count (P)', bias: 'Bias Distribution',
  numLayers: 'Number of Layers', minTemp: 'Min Temperature Tolerance',
  maxTemp: 'Max Temperature Tolerance', maturation: 'Maturation Period',
  health: 'Health Distribution', stamina: 'Stamina Distribution',
  toxicity: 'Toxicity Rate', vitality: 'Vitality', agility: 'Agility',
  intelligence: 'Intelligence', strength: 'Strength', luck: 'Luck', sex: 'Sex Distribution',
};

const chartOpts = reactive({});

const initializeCharts = () => {
  histKeys.forEach(key => {
    chartOpts[key] = createBarChartOptions(titles[key]);
  });
  chartOpts.sex = createPieChartOptions();
};

const createBarChartOptions = (title) => ({
  title: { text: title, textStyle: { color: config.textColor }, left: 'center' },
  tooltip: { backgroundColor: config.bgColor, textStyle: { color: config.textColor }, trigger: 'axis' },
  xAxis: { 
    type: 'category', 
    data: [], 
    axisLabel: { color: config.textColor }, 
    axisLine: { lineStyle: { color: config.textColor } }, 
    splitLine: { lineStyle: { color: config.textColor } } 
  },
  yAxis: { 
    type: 'value', 
    axisLabel: { color: config.textColor }, 
    axisLine: { lineStyle: { color: config.textColor } }, 
    splitLine: { lineStyle: { color: config.textColor } }
  },
  series: [{ type: 'bar', data: [], itemStyle: { color: config.figureColor } }],
  dataZoom: [
    { type: 'inside', start: 0, end: 100 },
    {
      type: 'slider',
      start: 0,
      end: 100,
      borderColor: 'lightgreen',
      fillerColor: 'rgba(144, 238, 144, 0.25)',
      handleStyle: {
        color: 'lightgreen',
        borderWidth: 1,
        borderColor: 'green'
      },
      dataBackground: {
        areaStyle: {
          color: 'green',
          opacity: 0.4
        },
        lineStyle: {
          color: 'green',
          opacity: 0.6
        }
      },
      selectedDataBackground: {
         areaStyle: {
          color: 'lightgreen',
          opacity: 0.4
        },
        lineStyle: {
          color: 'lightgreen',
          opacity: 0.6
        }
      },
      textStyle: {
        color: config.textColor
      }
    },
  ],
});

const createPieChartOptions = () => ({
  title: { text: titles.sex, textStyle: { color: config.textColor }, left: 'center' },
  color: config.sexColors,
  tooltip: { backgroundColor: config.bgColor, textStyle: { color: config.textColor }, formatter: '{b}: {c}' },
  legend: { orient: 'vertical', left: 'right', textStyle: { color: config.textColor } },
  series: [{
    type: 'pie',
    radius: ['20%', '40%'],
    center: ['50%', '50%'],
    label: { show: false },
    labelLine: { show: false },
    data: [],
    roam: true,
    selectedMode: 'single',
  }],
});

const processAndRenderData = async () => {
  const dataCounts = histKeys.reduce((acc, key) => ({ ...acc, [key]: {} }), {});
  const sexCounts = { male: 0, female: 0 };
  await FlowerStore.db.flowers.toCollection().each(f => {
    const g = JSON.parse(f.genome);
    const p = g.Flower.petals;
    const s = FlowerStore.fe.getFlowerStats(f.genome, 0.3, 23, 1000, 0);
    const vals = {
      radius: p.radius, P: p.P, bias: p.bias, numLayers: p.numLayers,
      minTemp: s.minTemperature, maxTemp: s.maxTemperature, maturation: s.maturationPeriod,
      health: s.health, stamina: s.stamina, toxicity: s.toxicityRate,
      vitality: s.effects.vitality, agility: s.effects.agility,
      intelligence: s.effects.intelligence, strength: s.effects.strength, luck: s.effects.luck,
    };
    histKeys.forEach(key => {
      const v = vals[key];
      dataCounts[key][v] = (dataCounts[key][v] || 0) + 1;
    });
    sexCounts[s.sex] = (sexCounts[s.sex] || 0) + 1;
  });
  histKeys.forEach(key => {
    const counts = dataCounts[key];
    const sortedKeys = Object.keys(counts).map(Number).sort((a, b) => a - b);
    chartOpts[key].xAxis.data = sortedKeys.map(String);
    chartOpts[key].series[0].data = sortedKeys.map(k => counts[k]);
  });
  chartOpts.sex.series[0].data = Object.entries(sexCounts).map(([name, value]) => ({ name, value }));
};


const loadAndRender = async () => {
  initializeCharts();
  await processAndRenderData();
  loading.value = false;
};

onMounted(() => {
  if(isMobile()){
    layout.chartWidth = '300px';
  }
  loadAndRender();
});
</script>

<style scoped>
  .dashboard-row{
    display: flex;
    flex-flow: row nowrap;
    gap: 1rem;
    padding: 5px;
  }
  .dashboard-col{
    display: flex;
    flex-flow: column nowrap;
    gap: 1rem;
    justify-content: center;
    padding: 20px;
  }
  .dashboard-grid{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
    gap: 1rem;
  }
  .center-grid{
    display: flex;
    justify-content: center;
  }
  h2{
    margin: 1rem 0 0.5rem;
    color: lightgreen;
    text-align: center;
    padding: 2px;
  }
</style>

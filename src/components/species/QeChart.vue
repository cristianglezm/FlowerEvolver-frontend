<template>
  <svg class="QeChart" :viewBox="'0 0 ' + W + ' ' + H" role="img" :aria-label="label" data-testid="qe-chart">
    <line :x1="LEFT" :y1="TOP" :x2="LEFT" :y2="H - BOTTOM" class="axis" />
    <line :x1="LEFT" :y1="H - BOTTOM" :x2="W - RIGHT" :y2="H - BOTTOM" class="axis" />
    <text :x="LEFT - 4" :y="y(range.top) + 4" text-anchor="end" class="tick" data-testid="qe-chart-top">{{ range.top.toFixed(2) }}</text>
    <text :x="LEFT - 4" :y="y(range.bottom) + 4" text-anchor="end" class="tick" data-testid="qe-chart-bottom">{{ range.bottom.toFixed(2) }}</text>
    <text v-for="tick in ticks" :key="tick.index" :x="x(tick.index)" :y="H - 8" text-anchor="middle" class="tick">{{ tick.text }}</text>
    <polyline :points="points" class="line" data-testid="qe-chart-line" />
    <circle v-for="(value, i) in props.values" :key="i" :cx="x(i)" :cy="y(value)" :r="props.values.length > 30 ? 2 : 3.5" class="dot" />
  </svg>
</template>

<script setup>
/**
 * One point for each epoch of a fine-tuning: how far the flowers are from the prototype of their species
 * on average. It goes down when the species fit the flowers better. The first point is the classifier
 * before it started.
 *
 * @param {Array<number>} values - At least one.
 * @param {string} firstLabel - What the first point is called on the axis.
 */
import { computed } from 'vue';

const props = defineProps({
    values: {
        type: Array,
        required: true
    },
    firstLabel: {
        type: String,
        default: 'before'
    }
});

const W = 320;
const H = 150;
const LEFT = 44;
const RIGHT = 12;
const TOP = 12;
const BOTTOM = 26;

// The values with a margin, and a range to draw when they are all the same.
const range = computed(() => {
    let low = Math.min(...props.values);
    let high = Math.max(...props.values);
    if(high - low < 1e-9){
        low -= 0.5;
        high += 0.5;
    }
    const pad = (high - low) * 0.1;
    // the labels are the values, the drawing has the margin around them
    return { low: low - pad, high: high + pad, top: high, bottom: low };
});
const x = (i) => LEFT + (props.values.length === 1 ? 0 : i * (W - LEFT - RIGHT) / (props.values.length - 1));
const y = (value) => TOP + (range.value.high - value) * (H - TOP - BOTTOM) / (range.value.high - range.value.low);
const points = computed(() => props.values.map((value, i) => `${x(i)},${y(value)}`).join(' '));
// a long run would print the labels on top of each other
const ticks = computed(() => {
    const every = Math.ceil(props.values.length / 8);
    return props.values
        .map((_, index) => ({ index, text: index === 0 ? props.firstLabel : String(index) }))
        .filter(({ index }) => index % every === 0 || index === props.values.length - 1);
});
const label = computed(() => {
    const first = props.values[0].toFixed(2);
    const last = props.values.at(-1).toFixed(2);
    return props.values.length === 1
        ? `Mean distance to the species prototype: ${first}`
        : `Mean distance to the species prototype after each epoch, from ${first} to ${last}`;
});
</script>

<style scoped>
    .QeChart{
        width: 100%;
        max-width: 22rem;
        background-color: #0b0b0b;
        border: 0.05rem solid #234;
    }
    .axis{
        stroke: #456;
    }
    .tick{
        fill: #90ee90;
        font-size: 10px;
    }
    .line{
        fill: none;
        stroke: #90ee90;
        stroke-width: 2;
    }
    .dot{
        fill: #90ee90;
    }
</style>

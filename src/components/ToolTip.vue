<template>
    <div class="tipInfo" @mouseenter="toggleInfo()" @mouseleave="toggleInfo()" @click="toggleInfo()">
        i
    </div>
    <div v-if="showing" class="infoBox" @mouseenter="toggleInfo()" @mouseleave="toggleInfo()">
        <p>{{ props.info }}</p>
    </div>
</template>

<script setup>
/**
 * ToolTip component
 * 
 * @component ToolTip
 * @prop {String} info - the information to display when the user clicks or hovers the component.
 * @example
 * <template>
 *     <ToolTip :info="'info to display'" />
 * </template>
 */
import { ref } from 'vue';

const props = defineProps({
    info: {
        type: String,
        required: true
    },
});
const showing = ref(false);
const toggleInfo = () => {
    showing.value = !showing.value;
};
</script>

<style scoped>
    .tipInfo{
        background-color: green;
        border: solid lightgreen;
        border-radius: 20px;;
        display: inline-grid;
        text-align: center;
    }
    .infoBox{
        background-color: green;
        border: solid lightgreen;
        border-radius: 20px;
        float:right;
        position: absolute;
        z-index: 1;
    }
</style>
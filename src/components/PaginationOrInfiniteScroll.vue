<template>
    <div v-if="props.pagination" :class="{container: props.itemsLength}">
        <div class="arrow" :class="{disabled: atStart()}" v-if="props.itemsLength"><button @click="prevPage()" :disabled="atStart()">&lt;</button></div>
        <slot></slot>
        <div class="arrow" :class="{disabled: atEnd()}" v-if="props.itemsLength"><button @click="nextPage()" :disabled="atEnd()">&gt;</button></div>
    </div>
    <div v-else>
        <slot></slot>
    </div>
</template>

<script setup>
/**
 * PaginationOrInfiniteScroll Component
 * 
 * This component provides pagination controls for navigating through content.
 *
 * @emits next-page - Event emitted when the "Next Page" button is clicked.
 * @emits prev-page - Event emitted when the "Previous Page" button is clicked.
 * @emits update-page - Event emitted when scrolling to the bottom of the page (if pagination is disabled).
 *
 * @param {boolean} pagination - Indicates whether to show pagination controls or Infinite Scroll.
 * @param {number} itemsLength - The total number of items in the content.
 * @param {number} currentPage - The current page number.
 * @param {number} totalPages - The total number of pages.
 */
import { onMounted, onBeforeUnmount} from 'vue';

const emit = defineEmits({
    'next-page': null,
    'prev-page': null,
    'update-page': null,
});
const props = defineProps({
    pagination: {
        type: Boolean,
        required: true
    },
    itemsLength: {
        type: Number,
        required: true
    },
    currentPage: {
        type: Number,
        required: true
    },
    totalPages: {
        type: Number,
        required: true
    },
});
const atStart = () => {
    return props.currentPage == 0;
};
const atEnd = () => {
    return props.currentPage >= (props.totalPages);
};
const nextPage = () => {
    if(!atEnd()){
        emit('next-page');
    }
};
const prevPage = () => {
    if(!atStart()){
        emit('prev-page');
    }
};
if(!props.pagination){
    onMounted(() => {
        window.onscroll = () => {
            var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight >= document.documentElement.offsetHeight;
            if(bottomOfWindow){
                emit('update-page');
            }
        };
    });
    onBeforeUnmount(() => {
        window.onscroll = () => {};
    });
}

</script>

<style scoped>
    .container{
        display: grid;
        grid-template-columns: 4.3rem auto 4.3rem;
        grid-gap: 0.6rem;
    }
    @media only screen and (max-width: 1280px){
        .container{
            display: grid;
            grid-template-columns: 1.25rem auto 1.25rem;
            grid-gap: 0.6rem;
        }
    }
    .arrow{
        background-color: rgb(37, 39, 41);
    }
    .arrow button{
        font-size: 2.5rem;
        color: green;
        border-radius: 7.8rem;
        background-color: lightgreen;
        text-align: center;
        padding: 0.31rem 0.93rem 0.31rem 0.93rem;
        position: relative;
        top: 50%;
        left: 0.1em;
        cursor: pointer;
    }
    .disabled button{
        cursor: not-allowed !important;
        opacity: 0.5;
        margin-bottom: -12.5rem;
    }
@media only screen and (max-width: 1280px){
    .arrow button{
        font-size: 0.93rem;
        border-radius: 7.8rem;
        padding: 0.125rem 0.75rem 0.125rem 0.75rem;
        top: 50%;
        left: 0.1em;
    }
}
    .arrow button:hover{
        background-color: green;
        color: lightgreen;
    }
</style>
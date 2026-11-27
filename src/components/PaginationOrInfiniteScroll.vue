<template>
  <div v-if="props.pagination">
    <nav v-if="props.itemsLength" class="pager" aria-label="Pages" data-testid="pager-top">
      <PageButton direction="previous" data-testid="page-previous-top" :disabled="atStart()" @click="prevPage()" />
      <PageButton direction="next" data-testid="page-next-top" :disabled="atEnd()" @click="nextPage()" />
    </nav>
    <slot />
    <nav v-if="props.itemsLength" class="pager" aria-label="Pages" data-testid="pager-bottom">
      <PageButton direction="previous" data-testid="page-previous-bottom" :disabled="atStart()" @click="prevPage()" />
      <PageButton direction="next" data-testid="page-next-bottom" :disabled="atEnd()" @click="nextPage()" />
    </nav>
  </div>
  <div v-else>
    <slot />
    <div v-if="showButton">
      <ReturnButton data-testid="back-to-top" @click="scrollToAnchor()" />
    </div>
  </div>
</template>

<script setup>
/**
 * PaginationOrInfiniteScroll Component
 * 
 * This component provides pagination controls for navigating through content: the arrows are above and below the
 * content, so that the page can be changed from where the person is.
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
import { onMounted, onBeforeUnmount, ref } from 'vue';
import ReturnButton from './ui/ReturnButton.vue';
import PageButton from './ui/PageButton.vue';

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
    anchor:{
        type: String,
        required: false,
        default: null
    }
});
let showButton = ref(false);
const atStart = () => {
    return props.currentPage == 0;
};
const atEnd = () => {
    return props.currentPage >= (props.totalPages - 1);
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
const scrollToAnchor = () => {
    if(props.anchor === undefined || props.anchor === null){
        window.scrollTo({ top: 0, behavior: "smooth" });
    }else{
        const anchorElement = document.getElementById(props.anchor);
        if (anchorElement) {
            anchorElement.scrollIntoView({ behavior: "smooth" });
        }
    }
    showButton.value = false;
};

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

const handleScroll = debounce(() => {
    const bottomOfWindow = document.documentElement.scrollTop + window.innerHeight >= document.documentElement.offsetHeight;
    if (bottomOfWindow) {
        showButton.value = true;
        emit('update-page');
    }
}, 200);

if(!props.pagination){
    onMounted(() => {
        if(props.anchor === undefined || props.anchor === null){
            window.scrollTo({ top: 0, behavior: "smooth" });
        }else{
            const anchorElement = document.getElementById(props.anchor);
            if (anchorElement) {
                anchorElement.scrollIntoView({ behavior: "smooth" });
            }
        }
        window.addEventListener('scroll', handleScroll);
    });
    onBeforeUnmount(() => {
        showButton.value = false;
        window.removeEventListener('scroll', handleScroll);
    });
}

</script>

<style scoped>
    .pager{
        display: flex;
        justify-content: center;
        gap: 1.25rem;
        padding: 0.6rem 0;
    }
</style>

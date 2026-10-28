import { reactive, computed } from 'vue';
import { useFlowerStore } from '../stores/FlowerStore';
import { useErrorStore } from '../stores/ErrorStore';

/**
 * @brief The paging of a list of flowers: one page at a time or infinite scroll, as the settings say.
 *
 * It keeps the page, the offset and the items of one list, which no other view reads, so they are not
 * in a store. The view gives it two functions and wires the rest to PaginationOrInfiniteScroll.
 * A failure of a fetch goes to the ErrorStore and leaves the list as it was.
 *
 * Destructure what it returns in the view (`const { state, isPaginated, ... } = usePaginatedList(...)`):
 * a template only unwraps the refs of the top level, isPaginated inside another object would always be truthy.
 *
 * @param {Function} fetchCount - () => Promise<number>, how many items there are. Only called when paginated.
 * @param {Function} fetchPage - ({ limit, offset }) => Promise<Array>, the items of a page or a batch.
 *
 * @example
 * const { state, isPaginated, init, nextPage, prevPage, nextBatch } = usePaginatedList({
 *     fetchCount: () => flowerRepository.countFlowers(),
 *     fetchPage: ({ limit, offset }) => flowerRepository.listFlowers({ limit, offset })
 * });
 * onMounted(() => init(parseInt(routes.query.page, 10) || 0));
 * // <PaginationOrInfiniteScroll :pagination="isPaginated" :items-length="state.items.length"
 * //     :current-page="state.page" :total-pages="state.totalPages"
 * //     @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch">
 */
export const usePaginatedList = ({ fetchCount, fetchPage }) => {
    const FlowerStore = useFlowerStore();
    const ErrorStore = useErrorStore();
    const state = reactive({
        items: [],
        offset: 0,
        page: 0,
        // how many pages there are, so the last one is totalPages - 1
        totalPages: 0
    });
    const isPaginated = computed(() => FlowerStore.settings.pagination);
    // What arrives after a newer page was asked for, or after init() started over, is not shown.
    let latest = 0;
    // the generation that has a batch on its way, scrolling asks again and again while it loads
    let batching = null;

    const load = async (page) => {
        const mine = ++latest;
        try{
            const offset = FlowerStore.calcOffset(page);
            const items = await fetchPage({ limit: FlowerStore.settings.limit, offset });
            if(mine === latest){
                state.page = page;
                state.offset = offset;
                state.items = items;
            }
        }catch(e){
            ErrorStore.push(e);
        }
    };
    const nextBatch = async () => {
        if(batching === latest){
            return;
        }
        const mine = latest;
        batching = mine;
        try{
            const from = state.offset;
            const batch = await fetchPage({ limit: FlowerStore.settings.limit, offset: from });
            if(mine === latest){
                state.items = state.items.concat(batch);
                state.offset = FlowerStore.increaseOffset(from);
            }
        }catch(e){
            ErrorStore.push(e);
        }finally{
            if(batching === mine){
                batching = null;
            }
        }
    };
    const init = async (startPage = 0) => {
        ++latest;
        state.items = [];
        state.offset = 0;
        state.page = 0;
        state.totalPages = 0;
        if(isPaginated.value){
            await load(startPage);
            try{
                state.totalPages = Math.ceil(await fetchCount() / FlowerStore.settings.limit);
            }catch(e){
                ErrorStore.push(e);
            }
        }else{
            await nextBatch();
        }
    };
    const nextPage = async () => {
        if(state.page < state.totalPages - 1){
            await load(state.page + 1);
        }
    };
    const prevPage = async () => {
        if(state.page >= 1){
            await load(state.page - 1);
        }
    };

    return { state, isPaginated, init, nextPage, prevPage, nextBatch };
};

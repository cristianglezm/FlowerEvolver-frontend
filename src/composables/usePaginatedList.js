import { reactive, computed, getCurrentScope, onScopeDispose } from 'vue';
import { useFlowerStore } from '../stores/FlowerStore';
import { useErrorStore } from '../stores/ErrorStore';
import { listenToList } from '../services/listEvents';

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
 * @param {String} [list] - the name of the list (see listEvents.js). A flower added to it while the view is on
 *     screen is shown at the top, one that was deleted goes away, and a reset reads the list again.
 * @param {Function} [accepts] - (flower, relation) => boolean, for a list that is about something: of the flowers that
 *     are announced to it only those that it returns true for are shown (see `relation` in listEvents.js).
 *     All of them are shown when there is none. What is read with fetchPage is not asked, the query chose it.
 * @param {Function} [onLoaded] - ({ items, offset, limit, append }) => any, called after items are shown, for what
 *     has to be loaded for them too. `append` is false for a page and for the first batch (they start the list, what
 *     was loaded for the list before is not wanted) and true for the batches that follow. It is not waited for, and a
 *     failure of it goes to the ErrorStore.
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
export const usePaginatedList = ({ fetchCount, fetchPage, list, accepts, onLoaded }) => {
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

    const loaded = (info) => {
        try{
            Promise.resolve(onLoaded?.(info)).catch((e) => ErrorStore.push(e));
        }catch(e){
            ErrorStore.push(e);
        }
    };

    const load = async (page) => {
        const mine = ++latest;
        try{
            const limit = FlowerStore.settings.limit;
            const offset = FlowerStore.calcOffset(page);
            const items = await fetchPage({ limit, offset });
            if(mine === latest){
                state.page = page;
                state.offset = offset;
                state.items = items;
                loaded({ items, offset, limit, append: false });
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
            const limit = FlowerStore.settings.limit;
            const batch = await fetchPage({ limit, offset: from });
            if(mine === latest){
                state.items = state.items.concat(batch);
                state.offset = FlowerStore.increaseOffset(from);
                // the first batch starts the list, as a page does: what was loaded for the list before is not wanted
                loaded({ items: batch, offset: from, limit, append: from > 0 });
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

    const idOf = (item) => (item !== null && typeof item === 'object') ? item.id : undefined;
    // not twice: a flower that is announced while the list is being read can already be in what was read
    const prepend = (item) => {
        const id = idOf(item);
        if(id !== undefined && state.items.some((i) => idOf(i) === id)){
            return;
        }
        state.items = [item, ...state.items];
    };
    const remove = (id) => {
        const kept = state.items.filter((i) => idOf(i) != id);
        if(kept.length !== state.items.length){
            state.items = kept;
        }
    };

    if(list){
        const stop = listenToList(list, {
            added: (item, relation) => {
                if(!accepts || accepts(item, relation)){
                    prepend(item);
                }
            },
            removed: remove,
            reset: () => init()
        });
        if(getCurrentScope()){
            onScopeDispose(stop);
        }
    }

    return { state, isPaginated, init, nextPage, prevPage, nextBatch, prepend, remove };
};

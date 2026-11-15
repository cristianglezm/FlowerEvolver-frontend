import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// the pages are counted from 0 in the address, as `init` gets them
const pageOf = (query) => Math.max(0, parseInt(query.page, 10) || 0);

/**
 * @brief Keeps the page that a paginated list shows in the address (`?page=`), and the address in the list.
 *
 * The page that the arrows move to is pushed to the history, so a reload or a link comes back to it and the
 * back button goes to the page before. When the list starts again by itself (a reset) the address is replaced, it
 * is not a place to go back to. When the address changes to another page, that is the page that is shown. The view
 * stays: the page is read in place, as the arrows do (see the key of the view in App.vue).
 *
 * Nothing is done in infinite scroll, which has no pages, or when the address is of another view.
 *
 * @param {Object} paged - what usePaginatedList returns.
 * @returns {{nextPage: Function, prevPage: Function}} the arrows, to give to the pagination in place of paged's.
 */
export const usePageInAddress = ({ state, isPaginated, nextPage, prevPage, goToPage }) => {
    const route = useRoute();
    const router = useRouter();
    const path = route.path;
    let byTheArrows = false;

    const arrow = (move) => async () => {
        byTheArrows = true;
        try{
            await move();
        }finally{
            byTheArrows = false;
        }
    };

    // the page that is shown goes to the address
    watch(() => state.page, (page) => {
        if(!isPaginated.value || route.path !== path || pageOf(route.query) === page){
            return;
        }
        const query = { ...route.query };
        if(page > 0){
            query.page = String(page);
        }else{
            delete query.page;
        }
        const location = { query, hash: route.hash };
        return byTheArrows ? router.push(location) : router.replace(location);
    }, { flush: 'sync' });

    // the address changes to another page: the back button, or a link of the same view
    watch(() => route.query.page, () => {
        // a link to another view changes the query too, and the view is going away
        if(!isPaginated.value || route.path !== path || pageOf(route.query) === state.page){
            return;
        }
        return goToPage(pageOf(route.query));
    });

    return { nextPage: arrow(nextPage), prevPage: arrow(prevPage) };
};

import mitt from 'mitt';

/**
 * Flowers are added to and deleted from the lists a view shows by actions that are called from elsewhere (a button
 * of the menu, a card) while that view is on screen. The view owns its list (see usePaginatedList), so the actions
 * cannot write to it: they say what happened, and the views that show that list apply it.
 *
 * `list` names the list that is affected: 'local' for the flowers of this browser.
 */
const bus = mitt();

/** A flower was added at the top of the list. */
export const flowerAdded = (list, flower) => bus.emit('added', { list, flower });
/** The flower with this id is gone. */
export const flowerRemoved = (list, id) => bus.emit('removed', { list, id });
/** The list was changed in a way that a view has to read again (everything was deleted, say). */
export const listReset = (list) => bus.emit('reset', { list });

/**
 * @param {String} list - the list to listen to.
 * @param {Object} handlers - { added(flower), removed(id), reset() }, all optional.
 * @returns {Function} stops listening.
 */
export const listenToList = (list, { added, removed, reset } = {}) => {
    const onAdded = (e) => { if(e.list === list){ added?.(e.flower); } };
    const onRemoved = (e) => { if(e.list === list){ removed?.(e.id); } };
    const onReset = (e) => { if(e.list === list){ reset?.(); } };
    bus.on('added', onAdded);
    bus.on('removed', onRemoved);
    bus.on('reset', onReset);
    return () => {
        bus.off('added', onAdded);
        bus.off('removed', onRemoved);
        bus.off('reset', onReset);
    };
};

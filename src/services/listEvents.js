import mitt from 'mitt';

/**
 * Flowers are added to and deleted from the lists a view shows by actions that are called from elsewhere (a button
 * of the menu, a card) while that view is on screen. The view owns its list (see usePaginatedList), so the actions
 * cannot write to it: they say what happened, and the views that show that list apply it.
 *
 * `list` names the list that is affected: 'local' for the flowers of this browser.
 *
 * A list that is about something (the mutations of a flower, the descendants of two parents) is not the list of
 * every flower that is made: a flower made from a mutation of the flower does not belong to it. So an added flower
 * can say what it is to others, its `relation`, and the list decides if it is one of its own:
 *   { original: id }       a mutation, of the flower with that id.
 *   { father: id, mother: id }  a child of those two flowers.
 */
const bus = mitt();

/** A flower was added at the top of the list. */
export const flowerAdded = (list, flower, relation) => bus.emit('added', { list, flower, relation });
/** The flower with this id is gone. */
export const flowerRemoved = (list, id) => bus.emit('removed', { list, id });
/** The list was changed in a way that a view has to read again (everything was deleted, say). */
export const listReset = (list) => bus.emit('reset', { list });

/**
 * @param {String} list - the list to listen to.
 * @param {Object} handlers - { added(flower, relation), removed(id), reset() }, all optional.
 * @returns {Function} stops listening.
 */
export const listenToList = (list, { added, removed, reset } = {}) => {
    const onAdded = (e) => { if(e.list === list){ added?.(e.flower, e.relation); } };
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

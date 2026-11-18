/**
 * Listens to an event of a channel and gives back the function that stops it. A component that
 * takes its listeners away with `off(event)` takes away everyone else's on the same event too;
 * this one takes away only the one that it put.
 *
 * @param {Object} channel - a mitt emitter
 * @param {String} event - the event to listen to
 * @param {Function} handler - what to call
 * @returns {Function} stops listening
 */
export const listen = (channel, event, handler) => {
    channel.on(event, handler);
    return () => channel.off(event, handler);
};

// What makes the view that is shown another one, and not the same one with other things to show: the page of a list
// is not part of it, a view reads its page from the address as it changes.
export const viewKeyOf = (route) => {
    const query = { ...route.query };
    delete query.page;
    return route.path + '?' + new URLSearchParams(query).toString() + route.hash;
};

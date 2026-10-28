/**
 * @brief What jsdom does not do: the scrolling, and the modal dialogs.
 *
 * jsdom has no layout, so it does not scroll: window.scrollTo() only prints "Not implemented" and
 * scrollIntoView() is not there at all. The components that scroll to the top or to an anchor when
 * they are shown (PaginationOrInfiniteScroll does, with infinite scroll) would fill the output of the
 * tests with that, or fail. A test that is about the scrolling spies on these.
 *
 * A <dialog> has no showModal() or close() either. Here they only open and close it, there is no top
 * layer and no focus to take: what a test can tell is whether it is open and that it said it closed.
 */
if(typeof window !== 'undefined'){
    window.scrollTo = () => {};
    if(typeof Element !== 'undefined' && !Element.prototype.scrollIntoView){
        Element.prototype.scrollIntoView = () => {};
    }
    if(typeof HTMLDialogElement !== 'undefined'){
        HTMLDialogElement.prototype.showModal ??= function(){
            this.setAttribute('open', '');
        };
        HTMLDialogElement.prototype.close ??= function(){
            this.removeAttribute('open');
            this.dispatchEvent(new Event('close'));
        };
    }
}

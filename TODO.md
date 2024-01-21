## TODO

* make website local first
    + [x] add dexie to use indexedDB to store flowers
    + [] adapt components and views to work with local and remote flowers
        + [x] remove message of 2s wait for disabled buttons?
        + components
            - Flower
                + [x] add button to convert remote flowers into locals
                + [x] add button to delete local flowers.
                    - [x] add modalYesNo
                    - [x] fix mutations delete error
                + [] fix error favourite icon not correctly loading in mutations and ancestors.
                + [x] add button to redraw flower (make a new flower with params)
                + [] add button to share flowers with backend - [not sure]
            - Header
                + [] add settings component tab
                + [] add route for settings component.
                + [] btn names too long, make them short
                + [x] add pagination for tabs
        + views
            - [x] Ancestors
                + [x] fix infinite scroll not working
                + [x] add pagination mode
            - [x] Browse
                + [x] infinite scroll does not work
                + [x] add pagination mode
            - [x] Demo
                + [x] load demo flowers
                + [x] add pagination mode
                + [x] fix infinite scroll not working
            - [x] Favourites
                + [x] fixed addToFav, isFavourited
                + [x] load flowers from db.favourites
                + [z] fix infinite scroll not working
                + [z] add pagination mode
            - [x] mutations
                + [x] fix infinite scroll not working
                + [x] add pagination mode
        + [] change demo component name to Local?
	+ [x] fix wasm module not loading in prod
    + [] fix deprecated mapGetters
    + [x] remake demo flowers (the images are different as activations from EvoAI were fixed)
* [] Make Settings view
    + [] pagination or infinite scroll modes
    + [] fetch demo flowers at start option.
    + [] configure params(radius, numLayers, P, bias)
    + [] configure mutation rates
    + [] limit per page
    + [] add button to reapply new params to flowers in the db? [not sure]
        - this would process all flowers and it would redraw with the new params
    + [] add button to export local flowers | favourites? into a generation json for native FlowerEvolver
* [x] make pagination component
* [] update backend server with new version
* [] update FlowerEvolver binaries to download
* [] clean code, squash and merge branch.

## TODO

* make website local first
    + [x] add dexie to use indexedDB to store flowers
    + [] adapt components and views to work with local and remote flowers
        + [] remove message of 2s wait for disabled buttons?
        + components
            - Flower
                + [x] add button to convert remote flowers into locals
                + [] add button to delete local flowers.
                    - add modalYesNo
                + [] add button to redraw flower (make a new flowers with params)
                    - menu keeps open after clicking.
                + [] add button to share flowers with backend - [not sure]
        + views
            - Ancestors
                + [] infinite scroll does not work
                + [] add pagination mode
            - Browse
                + [] infinite scroll does not work
                + [] add pagination mode
            - Demo
                + [x] load demo flowers
                + [] add pagination mode
                + [] infinite scroll does not work
            - Favourites
                + [x] fixed addToFav, isFavourited
                + [] load flowers from db.favourites
                + [] infinite scroll does not work
                + [] add pagination mode
            - mutations
                + [] infinite scroll does not work
                + [] add pagination mode
        + [] browse and lastAdded are remote only.
        + [] change demo component name to Local?
	+ [x] fix wasm module not loading in prod
    + [] fix deprecated mapGetters
    + [] remake demo flowers (ther images are different as activations from EvoAI changed)
* Make Settings component
    + pagination or infinite scroll modes
        - /Browse?page=1 works.
    + fetch demo flowers at start option.
    + configure params(radius, numLayers, P, bias)
    + configure mutation rates
    + limit per page
    + add button to reapply new params to flowers in the db? [not sure]
    + add button to export local flowers | favourites? into a generation json for native FlowerEvolver
* make pagination components
    + infinite scroll
    + pagination
* clean code, squash and merge branch.

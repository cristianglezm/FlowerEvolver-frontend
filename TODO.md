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
                + [x] add settings component tab
                + [x] add route for settings component.
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
                + [x] fix infinite scroll not working
                + [x] add pagination mode
            - [x] mutations
                + [x] fix infinite scroll not working
                + [x] add pagination mode
        + [] change demo component name to Local?
	+ [x] change name to Modal.vue and ModalYesNo.vue to ErrorModal, ConfirmModal
	+ [x] fix wasm module not loading in prod
    + [] fix deprecated mapGetters
    + [x] remake demo flowers (the images are different as activations from EvoAI were fixed)
* [] Make Settings view
    + [x] pagination or infinite scroll modes
    + [x] fetch demo flowers at first visit option.
    + [x] configure params(radius, numLayers, P, bias)
    + [x] configure mutation rates
    + [x] limit per page
    + [x] add button to remove all flowers.
    + [] make progressModal component
        - [] fix progress not updating
    + [] add button to redraw all flowers with the new params.
        - this would process all flowers and it would redraw with the new params
    + [] add button to export local flowers | favourites? into a generation json for native FlowerEvolver
    + [] add button to import local flowers from a generation.json
        - [] make uploadFileModal
    + [] validate params and mutation rates.
    + [] adapt css style to use the space better
* [x] make pagination component
* [] fix native app not drawing the same flowers
* [] update fe-wasm - validation code, add exception handler?
* [] update backend server with new version
* [] update FlowerEvolver binaries to download
* [] clean code, squash and merge branch.

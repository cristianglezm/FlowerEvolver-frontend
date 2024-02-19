## TODO

* make website local first
    + [x] add dexie to use indexedDB to store flowers
    + [x] adapt components and views to work with local and remote flowers
        + [x] remove message of 2s wait for disabled buttons?
        + components
            - Flower
                + [x] add button to convert remote flowers into locals
                    - [x] refactor to use fe.drawFlower
                + [x] add button to delete local flowers.
                    - [x] add ConfirmModal
                    - [x] fix mutations delete error
                + [] fix error favourite icon not correctly loading in mutations and ancestors.
                + [x] add button to redraw flower (make a new flower with params)
                + [] add button to share flowers with backend - [not sure]
            - AppHeader
                + [x] add settings component tab
                + [x] add route for settings component.
                + [x] add pagination for tabs
                + [x] use worker for flower garden?
                + [x] split into two components [AppTitle, AppMenu]
        + views
            - [x] Ancestors
                + [x] fix infinite scroll not working
                + [x] add pagination mode
            - [x] Browse
                + [x] infinite scroll does not work
                + [x] add pagination mode
            - [x] Local
                + [x] load demo flowers
                    - [x] refactor load with import worker
                    - [x] remove old demo flowers and add a generation.json to load and sent to importWorker.
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
        + [x] change demo component name to Local?
	+ [x] change name to Modal.vue and ModalYesNo.vue to ErrorModal, ConfirmModal
	+ [x] fix wasm module not loading in prod
    + [x] fix deprecated mapGetters
    + [x] remake demo flowers (the images are different as activations from EvoAI were fixed)
* [x] Make Settings view
    + [x] pagination or infinite scroll modes
    + [x] fetch demo flowers at first visit option.
    + [x] configure params(radius, numLayers, P, bias)
    + [x] configure mutation rates
    + [x] limit per page
    + [x] add button to remove all flowers.
        - [x] fix autoincrement not reseting
    + [x] add button to remove all but favourites.
        - [x] fix error, delete all, then add fav back not working.(keys?)
    + [x] make progressModal component
        - [x] fix progress not updating
    + [x] add button to redraw all flowers with the new params.
        - [x] fix OOM error in development, production works 
            + (vite cache wasn't invalidaded and it didn't update the 
                wasm module and it gave errors) forced it to executing npm run dev -- optimize --force
    + [x] add button to export local flowers | favourites? into a generation json for native FlowerEvolver
    + [x] add button to import local | favs flowers from a generation.json, Session.json or individual Flower.json
    + [x] validate params and mutation rates.
    + [x] save settings to localStorage when modified.
    + [x] adapt css style to use the space better
    + [x] add Tooltip component
    + [x] add storage usage stats
    + [x] add uploadFileModal
* [x] make pagination component
* [x] The native app renders flowers with slight differences in appearance
    - runtime differences between wasm and native [gcc, clang]
* [] refactorize OptionsAPI to CompositionAPI
    - [x] Flower
    - [] Ancestors
    - [] Browse
    - [] Favourites
    - [] Mutations
* [] fix eslint errors and warnings.
* [] update fe-wasm - validation code, add exception handler?
* [] update backend server with new version
* [] update FlowerEvolver binaries to download
* [] clean code, squash and merge branch.

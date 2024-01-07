## TODO

* make website local first
    + [x] add dexie to use indexedDB to store flowers
    + [] adapt components and views to work with local and remote flowers
		[] change getters - remove (state) => () => {}
		[] remove message of 2s wait for disabled buttons?
        + components
            - Flower
                + [x] add button to convert remote flowers into locals
                + [] add button to delete local flowers.
                    - add modalYesNo
                + [] add button to share flowers with backend - [not sure]
        + views
            - Ancestors
                + [] make parents reactive
                + [] infinite scroll does not work
                + [] add pagination
            - Browse
                + [] infinite scroll does not work
            - Demo
                + [x] load demo flowers
                + [] add pagination mode
                + [] infinite scroll does not work
            - Favourites
			    + [] fix addToFav [broken]
                + [] load flowers from db.favourites
                + [] infinite scroll does not work
			- mutations
			    + [] make original reactive
				+ [] infinite scroll does not work
				+ [] add pagination
        + browse and lastAdded are remote only.
        + make localFlowers and remoteFlowers
        + adapt buttons to work local only in Demo (change name?)
	+ fix wasm module not loading in prod
    + fix deprecated mapGetters
* Make Settings component
    + pagination or infinite scroll modes
        - /Browse?page=1 works.
    + fetch demo flowers at start option.
    + configure params(radius, numLayers, P, bias)
    + configure mutation rates
    + limit per page
    + add button to export local flowers | favourites? into a generation json for native FlowerEvolver
* make pagination components
    + infinite scroll
    + pagination
* clean code, squash and merge branch.

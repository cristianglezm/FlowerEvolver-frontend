## TODO

* make website local first
    + add dexie to use indexedDB to store flowers
    + adapt Flower component + others to work local first
        - make local the default way to work with flowers
          by fetching the data and converting it.
        + adapt buttons to work local only in Demo (change name?)
        + add button to convert remote flowers into locals
        + add button to share flowers with backend - [not sure]
    + adapt cd to download latest FlowerEvolver wasm and js module.
* Make Settings component
    + pagination or infinite scroll modes
        - /Browse?page=1 works.
    + fetch demo flowers at start option.
    + configure params(radius, numLayers, P, bias)
    + configure mutation rates
    + limit per page

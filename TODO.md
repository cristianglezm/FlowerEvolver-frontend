## TODO

* [x] cache manager (to delete models files)
* [x] make model options component for settings
* [x] refactor settings - split into components
    - [x] AppOptions
    - [x] CreationParams
    - [x] mutationsRates
    - [x] AppActions
    - [x] make new layout for settings
* [x] change xenova/transformers to huggingface/transformers
* [ ] test all models
    - fp32 works on CPU(it takes ~13s), GPU(it takes ~1m30s)
    - fp16 gives exception
    - q8 works on CPU (Firefox, Chrome, Edge)
    - q8 gives garbled output on Chrome and Edge (GPU)
    - int8 gives error on session creation (Can't create a session. ERROR_CODE: 9, ERROR_MESSAGE: Could not find an implementation for ConvInteger(10) node with name '/embeddings/patch_embeddings/projection/Conv_quant')
    - uint8 works on CPU
    - q4 works on CPU (it takes ~24s)
    - q4f16 gives exception.
    - bnb4 - works on CPU (it takes ~24s)
* [ ] fix not working on Chrome or Edge GPU
* [ ] Firefox webGPU not supported yet. (wait for it)

* [x] rename ModelOptions to CaptionerModelOptions
* [x] rename AIStore to CaptionerStore

* [ ] refactor - split store into stores

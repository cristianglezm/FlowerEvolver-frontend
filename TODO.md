# TODO

## FlowerCaptioner

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

## ChatBot

* [x] rename ModelOptions to CaptionerModelOptions
* [x] rename AIStore to CaptionerStore
* [x] rename AI.js for Chatbot and Captioner
* [x] use a different cache for Captioner and ChatBot
* [x] add reset command to Captioner and chatbot workers
    - [x] add requestReset to stores for ChatBot and Captioner
* [x] make ChatBot pipeline
    - [x] ChatBot class
    - [x] ChatBot Worker
    - [x] ChatBotStore
* [x] make command executor
* [x] make ChaBotModelOptions component
* [x] make ChatBotWidget component
    - [x] add button to toggle full screen
    - [x] add button to move the chat
    - [x] add ChatBotModelOptions
    - [x] add message if user writes to chatbot when offline to click on the red dot.
    - [x] fix style for phones
* [x] refactor AppMenu
* [x] document ChatBot-*
* [ ] prepare dataset
* [ ] finetune model
* [ ] change model name
* [ ] test all models
    - fp32 - CPU working, GPU working
    - fp16 - CPU not working, GPU?
    - q4   - CPU working, GPU working
    - q4f16- CPU not working, GPU?

* [ ] refactor - split store into stores
    - [x] prepare store split


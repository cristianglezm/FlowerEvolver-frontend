## TODO

* [ ] make model options component for settings
* [x] change xenova/transformers to huggingface/transformers
    - [x] adapt code for it
* [ ] test all
    - it is slower than 2.17 version.
    - q4 / q4f16 gives exception.
    - q8 gives garbled output on Chrome
* [ ] review regression on inference time for CPU
* [ ] review RAM usage skyrockets to ~5GB (master is ~1GB)
* [ ] fix not working on Chrome or Edge.
* [ ] Firefox webGPU not supported yet. (wait for it)

* [ ] refactor - split store into stores

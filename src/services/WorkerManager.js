export default class WorkerManager{
    /**
     * @brief Constructs a WorkerManager instance.
     * @param channel Emitter(mitt) The event emitter used for managing worker events.
     */
    constructor(channel){
        this.workers = new Map();
        this.channel = channel;
        // what was given to onError and onResponse, by worker: the channel can be shared, so a worker
        // takes away its own callbacks and not every listener of its events.
        this.callbacks = new Map();
    }
    /**
     * @brief Adds a worker to the manager and sets up message/error handlers.
     * @param name {String} The unique name used to identify the worker.
     * @param worker {Worker} The Web Worker instance to be managed.
     */
    addWorker(name, worker){
        this.workers.set(name, worker);
        worker.onmessage = (e) => {
            const data = e.data;
            this.channel.emit(name + '#onmessage', data);
        };
        worker.onerror = (e) => {
            const data = e.message + " at " + e.filename + " at line "+ e.lineno;
            this.channel.emit(name + '#onerror', data);
        }
    }
    /**
     * @brief it checks if worker with given name is added.
     * @param {String} name The name of the worker to check if added.
     * @returns {Boolean} boolean indicating if the worker exists or not.
     */
    has(name){
        return this.workers.has(name);
    }
    /**
     * @brief Removes a worker from the manager and cleans up event listeners.
     * @param name {String} The name of the worker to remove.
     */
    deleteWorker(name){
        if(!this.has(name)){
            return;
        }
        this.workers.get(name).terminate();
        this.workers.delete(name);
        this.forgetCallbacks(name);
    }
    /**
     * @brief Sends a request with data to a specific worker.
     * @param name {String} The name of the worker to send the request to.
     * @param data {Object} The data object to send to the worker.
     */
    sendRequest(name, data){
        const worker = this.workers.get(name);
        if(worker){
            worker.postMessage(data);
        }else{
            console.error(`Worker ${name} not found`);
        }
    }
    /**
     * @brief Registers an error callback for a specific worker.
     * @param name {String} The name of the worker to listen for errors from.
     * @param callback {Function} The function to call when an error occurs.
     */
    onError(name, callback){
        this.listen(name, '#onerror', callback);
    }
    /**
     * @brief Registers a response callback for a specific worker.
     * @param name {String} The name of the worker to listen for responses from.
     * @param callback {Function} The function to call when a response is received.
     */
    onResponse(name, callback){
        this.listen(name, '#onmessage', callback);
    }
    /**
     * @brief Listens to an event of a worker and remembers the callback to take it away with the worker.
     * @param name {String} The name of the worker.
     * @param suffix {String} The event of the worker, `#onerror` or `#onmessage`.
     * @param callback {Function} The function to call.
     */
    listen(name, suffix, callback){
        const event = name + suffix;
        this.channel.on(event, callback);
        if(!this.callbacks.has(name)){
            this.callbacks.set(name, []);
        }
        this.callbacks.get(name).push({ event, callback });
    }
    /**
     * @brief Takes away the callbacks that were given for a worker, and only those.
     * @param name {String} The name of the worker.
     */
    forgetCallbacks(name){
        for(const { event, callback } of this.callbacks.get(name) || []){
            this.channel.off(event, callback);
        }
        this.callbacks.delete(name);
    }
};

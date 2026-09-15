export default class WorkerManager{
    /**
     * @brief Constructs a WorkerManager instance.
     * @param channel Emitter(mitt) The event emitter used for managing worker events.
     */
    constructor(channel){
        this.workers = new Map();
        this.channel = channel;
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
        this.channel.off(name + '#onerror');
        this.channel.off(name + '#onmessage');
        this.workers.get(name).terminate();
        this.workers.delete(name);
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
        this.channel.on(name + '#onerror', callback);
    }
    /**
     * @brief Registers a response callback for a specific worker.
     * @param name {String} The name of the worker to listen for responses from.
     * @param callback {Function} The function to call when a response is received.
     */
    onResponse(name, callback){
        this.channel.on(name + '#onmessage', callback);
    }
};

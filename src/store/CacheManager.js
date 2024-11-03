/**
 * @brief Manages cache operations for a specified cache name.
 * 
 * This class handles the initialization of the cache, retrieval of cached items, 
 * and deletion of both hosts and individual files from the cache.
 */
export class CacheManager{
    /**
     * @param {string} cacheName - The name of the cache to manage.
     */
    constructor(cacheName){
        this.cacheRequests = [];
        this.cacheHosts = new Map();
        this.cacheName = cacheName;
        this.isInitialized = false;
        this.initCache();
    }
    /**
     * @brief Initializes the cache and populates cacheRequests and cacheHosts.
     * 
     * This method opens the specified cache, retrieves all cache requests,
     * and organizes the cached files by their respective hosts.
     * 
     * This method is called automatically during the construction of the 
     * CacheManager instance and will only run once.
     */
    async initCache(){
        if(this.isInitialized){
            return;
        }
        try{
            const currentCache = await caches.open(this.cacheName);
            if(currentCache){
                this.isInitialized = true;
                this.cacheRequests = await currentCache.keys();
                for(const req of this.cacheRequests){
                    const urlParts = req.url.split("/");
                    const host = urlParts.slice(0, 3).join("/");
                    const filename = urlParts[urlParts.length - 1]; 
                    if(this.cacheHosts.has(host)){
                        const files = this.cacheHosts.get(host);
                        if (!files.includes(filename)) {
                            files.push(filename);
                        }
                    }else{
                        this.cacheHosts.set(host, [filename]);
                    }
                }
            }
        }catch(e){
            console.error("Failed to initialize cache:", e);
        }
    }
    /**
     * @brief it reloads the cache
     */
    async reload(){
        this.isInitialized = false;
        this.cacheRequests = [];
        this.cacheHosts = new Map();
        await this.initCache();
    }
    /**
     * @brief return how many hosts are in this cache.
     * @returns number
     */
    size(){
        return this.cacheHosts.size;
    }
    /**
     * @brief Deletes all cached entries for a specified host.
     * 
     * @param {string} host - The host whose cached entries should be deleted.
     */
    async deleteHost(host){
        try{
            const currentCache = await caches.open(this.cacheName);
            if(currentCache && this.cacheHosts.has(host)){
                for(const req of this.cacheRequests){
                    if(req.url.includes(host)){
                        await currentCache.delete(req);
                    }
                }
                this.cacheHosts.delete(host);
            }
        }catch(e){
            console.error("Failed to delete host from cache:", e);
        }
    }
    /**
     * @brief Deletes multiple files from a specified host.
     * 
     * @param {string} host - The host from which to delete the files.
     * @param {string[]} filenames - An array of filenames to delete.
     */
    async deleteFilesFrom(host, filenames) {
        try{
            const currentCache = await caches.open(this.cacheName);
            if(currentCache){
                for(const filename of filenames){
                    const reqToDelete = this.cacheRequests.find(req => 
                        req.url.includes(host) && req.url.endsWith(filename)
                    );
                    if(reqToDelete){
                        await currentCache.delete(reqToDelete);
                        const files = this.cacheHosts.get(host) || [];
                        this.cacheHosts.set(host, files.filter(file => file !== filename));
                        if(this.cacheHosts.get(host).length === 0){
                            this.cacheHosts.delete(host);
                        }
                    }else{
                        console.warn(`File ${filename} not found in cache for host ${host}.`);
                    }
                }
            }
        }catch (e){
            console.error(`Failed to delete files from host ${host}:`, e);
        }
    }
    /**
     * @brief check if has all files inside host.
     * @param {String} host 
     * @param {Array} files 
     * @returns Boolean
     */
    hasFiles(host, files){
        if(!this.cacheHosts.has(host)){
            return false;
        }
        for(const file of files){
            if(!this.cacheHosts.get(host).find( f => f === file)){
                return false;
            }
        }
        return true;
    }
}

export default { CacheManager };
/**
 * @brief An in-memory localStorage for the unit tests that run in node.
 *
 * The stores read their saved settings from localStorage when they are created, and only jsdom had one.
 * Creating a jsdom for every test file was most of the time the unit tests took, so they run in node and
 * only the files that need a DOM ask for jsdom with `// @vitest-environment jsdom`, which has its own.
 * Like the real one it keeps strings, and every test file starts with an empty one.
 */
class MemoryStorage{
    #items = new Map();

    get length(){
        return this.#items.size;
    }

    key(index){
        return [...this.#items.keys()][index] ?? null;
    }

    getItem(key){
        return this.#items.get(String(key)) ?? null;
    }

    setItem(key, value){
        this.#items.set(String(key), String(value));
    }

    removeItem(key){
        this.#items.delete(String(key));
    }

    clear(){
        this.#items.clear();
    }
}

if(typeof window === 'undefined'){
    Object.defineProperty(globalThis, 'localStorage', {
        value: new MemoryStorage(),
        configurable: true,
        writable: true
    });
}

import { defineStore } from "pinia";

/**
 * @brief Pinia store to manage a collection of documents.
 */
export const useDocumentStore = defineStore('documentStore', {
    state: () => ({
        documents: new Map()
    }),
    getters:{
        /**
         * @brief Retrieves a specific document by its title.
         * @param {string} key - The title of the document.
         * @returns {string|undefined} The content of the document, or undefined if not found.
         */
        getDocument: (state) => (key) =>{
            return state.documents.get(key);
        },
        /**
         * @brief Retrieves all documents as an array of objects.
         * @param {Object} state - The store's state.
         * @returns {Array<Object>} An array of document objects with `title` and `content`.
         */
        getDocuments: (state) => () => {
            return Object.keys(state.documents).map(title => ({ title: title, content: state.documents.get(title) }));
        }
    },
    actions:{
        /**
         * @brief Adds a new document to the store.
         * @param {string} title - The title of the document.
         * @param {string} content - The content of the document.
         */
        addDocument(title, content){
            this.documents.set(title, content);
        },
        /**
         * @brief Checks if a document exists in the store by its title.
         * @param {string} title - The title of the document to check.
         * @returns {boolean} `true` if the document exists, otherwise `false`.
         */
        hasDocument(title){
            return this.documents.has(title);
        },
        /**
         * @brief Removes a document from the store by its title.
         * @param {string} title - The title of the document to remove.
         */
        removeDocument(title){
            this.documents.delete(title);
        },
        /**
         * @brief Retrieves all document titles (keys).
         * @returns {Array<string>} An array of document titles.
         */
        keys(){
            return Array.from(this.documents.keys());
        },
        /**
         * @brief Maps an array of documents into the store.
         * @param {Array<Object>} documents - An array of document objects with `title` and `content`.
         * @example
         * const docs = [{ title: 'Doc1', content: 'Content1' }, { title: 'Doc2', content: 'Content2' }];
         * store.map(docs);
         */
        map(documents){
            for(const d of documents){
                this.documents.set(d.title, d.content);
            }
        },
    }
});

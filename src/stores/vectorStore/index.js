import { defineStore } from "pinia";
import { toRaw } from "vue";

const cosineSimilarity = (vecA, vecB) => {
    if (vecA.length !== vecB.length) {
        throw new Error("vecA and vecB size should be equal.");
    }
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for(let i = 0; i < vecA.length; ++i){
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    if(magnitudeA === 0 || magnitudeB === 0){
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * @brief Pinia store to manage a collection of tools and documents embeddings.
 */
export const useVectorStore = defineStore('vectorStore', {
    state: () => ({
        documents: new Map(),
        tools: new Map(),
        tools_embeddings: new Map(),
        documents_embeddings: new Map()
    }),
    getters:{
        /**
         * @brief Retrieves a specific document by its title.
         * @param {string} key - The title of the document.
         * @returns {string|undefined} The content of the document, or undefined if not found.
         */
        getDocument: (state) => (key) =>{
            return toRaw(state.documents.get(key));
        },
        /**
         * @brief Retrieves all documents as an array of objects.
         * @returns {Array<Object>} An array of document objects with `title` and `content`.
         */
        getDocuments: (state) => {
            return Object.keys(state.documents).map(title => ({ title: title, content: state.documents.get(title) }));
        },
        /**
         * @brief Retrieves all embeddings as an array of objects (key, embeddings)
         * @returns {Array<Object>} an array of { key, embeddings }
         */
        getDocumentsEmbeddings: (state) => () => {
            return Array.from(state.documents_embeddings.keys()).map(title => ({ 
                key: title,
                embeddings: toRaw(state.documents_embeddings.get(title))
            }));
        },
        /**
         * @brief returns the size of documents
         * @returns {number}
         */
        getDocumentLength: (state) => {
            return state.documents.size;
        },
        /**
         * @brief Retrieves a specific tool by its description.
         * @param {string} key - The description of the tool.
         * @returns {string|undefined} The tool or undefined if not found.
         */
        getTool: (state) => (key) => {
            return state.tools.get(key);
        },
        /**
         * @brief Retrieves all tools as an array of Objects.
         * @returns {Array<Object>} An array of tools.
         */
        getTools: (state) => {
            return Array.from(state.tools.keys()).map(key => (toRaw(state.tools.get(key))));
        },
        /**
         * @brief Retrieves all embeddings as an array of objects (key, embeddings).
         * @returns {Array<Object>} an array of { key, embeddings }
         */
        getToolsEmbeddings: (state) => () => {
            return Array.from(state.tools_embeddings.keys()).map(key => ({ 
                key: key, 
                embeddings: toRaw(state.tools_embeddings.get(key))
            }));
        },
        /**
         * @brief returns the size of tools
         * @returns {number}
         */
        getToolsLength: (state) => {
            return state.tools.size;
        },
        /**
         * @brief returns the size of documents + tools
         * @returns {number}
         */
        getLength: (state) => {
            return state.tools.size + state.documents.size;
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
         * @brief adds the embeddings to the store.
         * @param {String} title 
         * @param {Float32Array} embeddings 
         */
        addDocumentEmbeddings(title, embeddings){
            this.documents_embeddings.set(title, embeddings);
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
        documentsKeys(){
            return Array.from(this.documents.keys());
        },
        /**
         * @brief Maps an array of documents into the store.
         * @param {Array<Object>} documents - An array of document objects with `title` and `content`.
         * @example
         * const docs = [{ title: 'Doc1', content: 'Content1' }, { title: 'Doc2', content: 'Content2' }];
         * store.map(docs);
         */
        mapDocuments(documents){
            for(const d of documents){
                this.documents.set(d.title, d.content);
            }
        },
        /**
         * @brief Retrieves the documents titles that are similar to embeddings
         * @param {Float32Array} embeddings
         * @param {Number} threshold - threshold (default 0.5)
         * @returns {Array<String>} the document titles that are similar.
         */
        retrieveDocuments(embeddings, threshold = 0.5){
            let documentsEmbedds = this.getDocumentsEmbeddings();
            let documentsTitles = new Array();
            if(documentsEmbedds){
                for(const de of documentsEmbedds){
                    let similarityCoeff = cosineSimilarity(embeddings, de.embeddings);
                    if(similarityCoeff >= threshold){
                        documentsTitles.push(toRaw(de.key));
                    }
                }
            }
            return documentsTitles;
        },
        /**
         * @brief adds a new tool to the store.
         * @param {String} key - the key of the tool 
         * @param {Object} tool - the Json Schema for tool
         */
        addTool(key, tool){
            this.tools.set(key, tool);
        },
        /**
         * @brief adds the embeddings to the store.
         * @param {String} key 
         * @param {Float32Array} embeddings 
         */
        addToolEmbeddings(key, embeddings){
            this.tools_embeddings.set(key, embeddings);
        },
        /**
         * @brief Checks if a tool exists in the store by its description.
         * @param {String} key - the key of the tool to check
         * @returns {boolean} `true` if the tool exists, otherwise `false`.
         */
        hasTool(key){
            return this.tools.has(key);
        },
        /**
         * @brief Removes a tool from the store by its key.
         * @param {string} key - The key of the tool to remove.
         */
        removeTool(key){
            this.tools.delete(key);
        },
        /**
         * @brief Retrieves all tools names (keys).
         * @returns {Array<string>} An array of tools descriptions.
         */
        toolsKeys(){
            return Array.from(this.tools.keys());
        },
        /**
         * @brief maps an array of Tools into the store.
         * @param {Array<Object>} tools - tools array
         * @param {Function} getKey - Function to get key from tool
         */
        mapTools(tools, getKey = (tool) => {return tool.description}){
            for(const t of tools){
                this.tools.set(getKey(t), toRaw(t));
            }
        },
        /**
         * @brief Retrieves the tools that are similar to embeddings
         * @param {Float32Array} embeddings 
         * @param {Number} threshold - threshold (default 0.5)
         * @returns {Array<Object>} the tools that are similar.
         */
        retrieveTools(embeddings, threshold = 0.5){
            let toolsEmbedds = this.getToolsEmbeddings();
            let tools = new Array();
            if(toolsEmbedds){
                for(const te of toolsEmbedds){
                    let similarityCoeff = cosineSimilarity(embeddings, te.embeddings);
                    if(similarityCoeff >= threshold){
                        tools.push(toRaw(this.tools.get(te.key)));
                    }
                }
            }
            return tools;
        }
    }
});

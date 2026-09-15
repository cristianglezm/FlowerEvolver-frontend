import { getREmbeddings } from '../stores/ChatBotStore/ChatBot';
import { getEmbeddings } from '../stores/ChatBotStore/ChatBot';
import { chat } from '../stores/ChatBotStore/ChatBot';
import { rChat } from '../stores/ChatBotStore/ChatBot';
import { ChatBot } from '../stores/ChatBotStore/ChatBot';
import { rStreamingChat } from '../stores/ChatBotStore/ChatBot';
import { streamingChat } from '../stores/ChatBotStore/ChatBot';
/**
 * @brief Web Worker that manages tasks related to loading a chatbot model, resetting it, and processing chat interactions.
 * 
 * This Web Worker listens for messages from the main thread, processes various tasks, and sends relevant updates or responses back.
 * The worker handles tasks such as:
 *   - Loading a new chatbot model with specific configuration options.
 *   - Resetting the chatbot instance.
 *   - Handling both streaming and non-streaming chat interactions.
 * 
 * Based on the received message type, the worker either loads a model, resets the model, or processes a chat message using the model.
 * It reports progress and completion events back to the main thread, as well as the chat responses or other results.
 * 
 * The worker uses the `ChatBot` class to manage model loading, resetting, and chatting. It also reports progress via `postMessage` to update the UI.
 * 
 * @param {String} e.data.jobType - The type of job requested by the main thread. Possible values:
 *   - `"loadModel"`: Load the model with new configuration options.
 *   - `"reset"`: Reset the chatbot model and clear its state.
 *   - `"streaming"`: Handle a streaming chat request, process the response and sends the tokens.
 *   - `"rStreaming"`: Handle server(llamacpp server, OpenAI, ...) streaming chat requests, process the response and sends the tokens.
 *   - `"chat"`: Handle a non-streaming chat request and send the response back.
 *   - `"rChat"`: Handle server(llamacpp server, OpenAI, ...) non-streaming chat request and send the response back.
 *   - '"embeddings"': Handle a embeddings request and sends the embeddings back.
 *   - '"rEmbeddings"': Handle server(llamacpp server, OpenAI, ...) embeddings request and sends the embeddings back.
 * 
 * @param {Object} e.data.modelOptions - Configuration options for the model (only for the `"loadModel"` job type).
 *   @property {String} host - The host for the model (e.g., `"huggingface"` or `"localhost"`).
 *   @property {String} model - The model identifier (e.g., `"HuggingFaceTB/SmolLM2-135M-Instruct"`).
 *   @property {String} device - The device for running the model (e.g., `"CPU"`).
 *   @property {String} dtype - The data type for the model (e.g., `"q4"`).
 * 
 * @param {Object} e.data.remoteOptions - Configuration options for the rStreaming and rChat requests:
 *   @property {String} url - The backend URL for the LLM server. Default: `"http://localhost:8080"`.
 *   @property {String} api_key - API key for backend access, if required. Default: `"sk-no-key-required"`.
 *   @property {String} model - The model to be used for generating responses. Default: `"HuggingFaceTB/SmolLM2-135M-Instruct"`.
 *   @property {Number} max_tokens - Limits the maximum number of tokens generated in a single response. Default: `256`.
 *   @property {Number} top_k - Considers the top K most probable choices when generating responses. Default: `40`.
 *   @property {Number} top_p - Considers tokens until their cumulative probability exceeds P. Default: `0.95`.
 *   @property {Number} min_p - Filters out tokens with probabilities below this threshold. Default: `0.05`.
 *   @property {Number} temperature - Controls randomness in responses. Default: `0.8`.
 * 
 * @param {Array<Object>} e.data.messages - An array of chat messages, where each message is an object with `role` and `content` properties 
 *                                           (only for `"streaming"`, `"chat"`, `"rChat"` and `"rStreaming"` job types).
 *   @property {String} role - The role of the sender (e.g., `"user"`, `"assistant"`, `"system"`).
 *   @property {String} content - The content of the message (e.g., the text of the message).
 * 
 * @example
 * e.data.messages = [
 *   { role: "user", content: "Hello, how are you?" },
 *   { role: "assistant", content: "I'm here to help you!" },
 *   { role: "system", content: "Welcome to the chatbot." }
 * ];
 * 
 * @param {Array} e.data.tools - The list of tools to be used with the model, passed during chat processing (only for `"streaming"`, `"chat"`, `"rChat"` and `"rStreaming"` job types).
 * @param {Array} e.data.documents - A list of documents to provide context to the chat (only for `"streaming"`, `"chat"`, `"rChat"` and `"rStreaming"` job types).
 * @param {String} e.data.chat_template - A template for the chat context (only for `"streaming"`, `"chat"`, `"rChat"` and `"rStreaming"` job types).
 *
 * @example
 * // Send a message to the worker to load a model
 * ChatBotWorker.postMessage({
 *   jobType: "loadModel",
 *   modelOptions: {
 *     host: "huggingface",
 *     model: "HuggingFaceTB/SmolLM2-135M-Instruct",
 *     device: "CPU",
 *     dtype: "q4"
 *   }
 * });
 * 
 * // Send a message to the worker for a chat response
 * ChatBotWorker.postMessage({
 *   jobType: "chat",
 *   messages: [
 *     { role: "user", content: "Hello, chatbot!" }
 *   ],
 *   tools: null,
 *   documents: null,
 *   chat_template: null
 * });
 * // the worker will respond with a jobType of "streaming" for each token and "response" for a completed message.
 *          self.postMessage({
 *            jobType:"streaming",
 *            response: text
 *          });
 * 
 *          self.postMessage({
 *            jobType:"response",
 *            response: text
 *          });
 * // in case of error it will respond with this
 *          self.postMessage({
 *            jobType:"error",
 *            error: error
 *          });
 */

/**
 * @brief Compares the provided model options with the current model options to check for changes.
 * @param {Object} modelOptions - The model options to compare.
 * @param {String} modelOptions.host - The host URL or identifier.
 * @param {String} modelOptions.model - The model identifier.
 * @param {String} modelOptions.device - The device where the model will run (e.g., "CPU").
 * @param {String} modelOptions.dtype - The data type used by the model (e.g., "q4").
 * @returns {Boolean} - Returns true if the model options have changed, false otherwise.
 */
const hasModelOptionsChanged = (modelOptions) => {
    return ((ChatBot.modelOptions.host !== modelOptions.host) ||
            (ChatBot.modelOptions.model !== modelOptions.model) ||
            (ChatBot.modelOptions.device !== modelOptions.device) ||
            (ChatBot.modelOptions.dtpe !== modelOptions.dtype));
};
/**
 * @brief Loads the model with the specified options. If the model options have changed, it resets the chatbot instance.
 *        This function also handles progress reporting and communication with the worker thread.
 * @param {Object} modelOptions - The new model options to use.
 * @param {String} modelOptions.host - The host URL or identifier.
 * @param {String} modelOptions.model - The model identifier.
 * @param {String} modelOptions.device - The device where the model will run (e.g., "CPU").
 * @param {String} modelOptions.dtype - The data type used by the model (e.g., "q4").
 */
const loadModel = async (modelOptions) => {
    if(hasModelOptionsChanged(modelOptions)){
        await ChatBot.reset();
    }
    ChatBot.setModelOptions(modelOptions);
    ChatBot.getInstance((data) => {
        switch(data.status){
          case "initiate":{
              let event = {
                status: "init",
                name: data.file,
                progress: 0,
                total: 100
              };
              self.postMessage({
                jobType: "updateProgressBar",
                eventName: "ChatBotWidget#requestMultiProgressBar",
                event: event
              });
          }
            break;
          case "progress":{
              let event = {
                status: "update",
                name: data.file,
                progress: data.progress
              };
              self.postMessage({
                jobType: "updateProgressBar",
                eventName: "ChatBotWidget#requestMultiProgressBar",
                event: event
              });
          }
            break;
          case "ready":{
            self.postMessage({
                jobType: "updateBtnTitle",
                eventName: "ChatBotModelOptions#updateBtnTitle",
                event: ""
            });
          }
            break;
        }
    });
}
const rStreaming = async (e) => {
    const messages = e.data.messages;
    const tools = e.data.tools;
    const documents = e.data.documents;
    const chat_template = e.data.chat_template;
    const remoteOptions = e.data.remoteOptions;
    let response = await rStreamingChat(messages, (text) => {
        self.postMessage({
          jobType:"streaming",
          response: text
        });
    }, remoteOptions, {tools, documents, chat_template});
    self.postMessage({
        jobType: "response",
        response: response
    });
    self.postMessage({
      jobType:"done"
    });
};
const streaming = async (e) => {
    const messages = e.data.messages;
    const tools = e.data.tools;
    const documents = e.data.documents;
    const chat_template = e.data.chat_template;
    let response = await streamingChat(messages, (text) => {
      self.postMessage({
        jobType:"streaming",
        response: text
      });
    }, {tools, documents, chat_template});
    self.postMessage({
        jobType: "response",
        response: response
    });
    self.postMessage({
      jobType:"done"
    });
};
const _rChat = async (e) => {
    const messages = e.data.messages;
    const tools = e.data.tools;
    const documents = e.data.documents;
    const remoteOptions = e.data.remoteOptions;
    const chat_template = e.data.chat_template;
    let response = await rChat(messages, remoteOptions, {tools, documents, chat_template});
    self.postMessage({
        jobType: "response",
        response: response
    });
    self.postMessage({
      jobType:"done"
    });
};
const _chat = async (e) => {
    const messages = e.data.messages;
    const tools = e.data.tools;
    const documents = e.data.documents;
    const chat_template = e.data.chat_template;
    let response = await chat(messages, {tools, documents, chat_template});
    self.postMessage({
        jobType: "response",
        response: response
    });
    self.postMessage({
      jobType:"done"
    });
};
const _getEmbeddings = async (e) => {
    const type = e.data.type;
    const texts = e.data.texts;
    for(const text of texts){
        let response = await getEmbeddings(text);
        self.postMessage({
            jobType: "embeddings",
            type: type,
            text: text,
            embeddings: response
        });
    }
};
const _getREmbeddings = async (e) => {
    const type = e.data.type;
    const texts = e.data.texts;
    const remoteOptions = e.data.remoteOptions;
    for(const text of texts){
        let response = await getREmbeddings(text, remoteOptions);
        self.postMessage({
            jobType: "embeddings",
            type: type,
            text: text,
            embeddings: response
        });
    }
};
self.onmessage = async (e) => {
    const jobType = e.data.jobType;
    switch(jobType){
        case "loadModel":{
          try{
            loadModel(e.data.modelOptions);
          }catch(e){
            self.postMessage({
              jobType: "error",
              error: e
            });
          }
        }
            break;
        case "reset":{
            try{
              await ChatBot.reset();
            }catch(e){
              self.postMessage({
                jobType: "error",
                error: e
              });
            }
        }
            break;
        case "rStreaming":{
            try{
              await rStreaming(e);
            }catch(e){
              self.postMessage({
                jobType: "error",
                error: e
              });
            }
        }
            break;
        case "streaming":{
            try{
              await streaming(e);
            }catch(e){
              self.postMessage({
                jobType: "error",
                error: e
              });
            }
        }
            break;
        case "rChat":{
            try{
              await _rChat(e);
            }catch(e){
              self.postMessage({
                jobType: "error",
                error: e
              });
            }
        }
            break;
        case "chat":{
          try{
            await _chat(e);
          }catch(e){
            self.postMessage({
              jobType: "error",
              error: e
            });
          }
        }
            break;
        case "embeddings":{
          try{
            await _getEmbeddings(e);
          }catch(e){
            self.postMessage({
              jobType: "error",
              error: e
            });
          }
        }
            break;
        case "rEmbeddings":{
          try{
            await _getREmbeddings(e);
          }catch(e){
            self.postMessage({
              jobType: "error",
              error: e
            });
          }
        }
            break;
    }
};

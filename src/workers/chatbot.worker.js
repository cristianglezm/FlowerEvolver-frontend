import { chat, ChatBot, streamingChat } from '../stores/ChatBotStore/ChatBot';
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
 * @param {Object} e - The event object containing the message data from the main thread.
 * @param {String} e.data.jobType - The type of job requested by the main thread. Possible values:
 *   - `"loadModel"`: Load the model with new configuration options.
 *   - `"reset"`: Reset the chatbot model and clear its state.
 *   - `"streaming"`: Handle a streaming chat request, process the response, and send progress updates.
 *   - `"chat"`: Handle a non-streaming chat request and send the response back.
 * 
 * @param {Object} e.data.modelOptions - Configuration options for the model (only for `"loadModel"` job type).
 *   - `host`: The host for the model (e.g., `"huggingface"` or `"localhost"`).
 *   - `model`: The model identifier (e.g., `"HuggingFaceTB/SmolLM2-135M-Instruct"`).
 *   - `device`: The device for running the model (e.g., `"CPU"`).
 *   - `dtype`: The data type (e.g., `"q4"`).
 * 
 * @param {Array} e.data.messages - An array of chat messages, where each message is an object with `role` and `content` properties (only for `"chat"` and `"streaming"` job types).
 *   - `role`: The role of the sender (e.g., `"user"`, `"assistant"`, `"system"`).
 *   - `content`: The content of the message (e.g., the text of the message).
 * 
 * @param {Array} e.data.tools - The list of tools to be used with the model, passed during chat processing (only for `"streaming"` and `"chat"` job types).
 * @param {Array} e.data.documents - A list of documents to provide context to the chat (only for `"streaming"` and `"chat"` job types).
 * @param {String} e.data.chat_template - A template for the chat context (only for `"streaming"` and `"chat"` job types).
 *
 * @example
 * // Send a message to the worker to load a new model
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
 * // the model will respond with a jobType of "streaming" for each token and "response" for a completed message.
 *          self.postMessage({
 *            jobType:"streaming",
 *            response: text
 *          });
 * 
 *          self.postMessage({
 *            jobType:"response",
 *            response: text
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
self.onmessage = async (e) => {
    const jobType = e.data.jobType;
    switch(jobType){
        case "loadModel":{
            loadModel(e.data.modelOptions);
        }
            break;
        case "reset":{
            await ChatBot.reset();
        }
            break;
        case "streaming":{
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
        }
            break;
        case "chat":{
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
        }
            break;
    }
};

import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { ModelCache, isGPUAvailable } from '../AIUtils';

export const CACHE_KEY = 'fe-chatbot-cache';
export { isGPUAvailable };

/**
 * @class ChatBot
 * @brief A singleton class that manages the ChatBot instance for text generation tasks.
 */
export class ChatBot{
	static task = "text-generation";
 	static modelOptions = {
		host: "huggingface",
		model: "HuggingFaceTB/SmolLM2-135M-Instruct",
		device: "CPU",
		dtype: "q4"
	};
	static instance = null;
    /**
     * @brief Updates the model configuration options.
     * @param {Object} modelOptions - Custom options to set the model configuration.
     * @default
     * const modelOptions = {
     *      host: "huggingface",
     *      model: "HuggingFaceTB/SmolLM2-135M-Instruct",
     *      device: "CPU",
     *      dtype: "q4"
     * };
     */
	static setModelOptions(modelOptions){
		this.modelOptions = modelOptions;
	}
    /**
     * @brief Retrieves the chatbot instance or initializes it if not already loaded.
     * @param {Function|null} progress_callback - A callback function for reporting progress.
     * @returns {Promise<Object>} - The initialized chatbot instance.
     */
	static async getInstance(progress_callback = null){
        if(this.instance === null){
            env.useBrowserCache = false;
            env.useCustomCache = true;
            env.customCache = new ModelCache(CACHE_KEY);
            if(this.modelOptions.host === 'localhost'){
                env.localModelPath = 'http://localhost/';
                env.allowLocalModels = true;
                env.allowRemoteModels = false;
            }else{
                env.localModelPath = '/models/';
                env.allowLocalModels = false;
                env.allowRemoteModels = true;
            }
            this.instance = pipeline(this.task, this.modelOptions.model,
            {
                dtype: this.modelOptions.dtype,
                device: this.modelOptions.device === "CPU" ? "wasm":"webgpu",
                progress_callback
            });
        }
        return this.instance;
	}
    /**
     * @brief Checks if the chatbot model has already been loaded.
     * @returns {Boolean} - True if the model is loaded; otherwise, false.
     */
	static hasModelLoaded(){
		return this.instance !== null;
	}
    /**
     * @brief Resets and disposes of the chatbot instance.
     */
	static async reset(){
		if(this.hasModelLoaded()){
			(await this.getInstance()).dispose();
			this.instance = null;
		}
	}
};
/**
 * @brief Formats the raw output of the chatbot into structured JSON.
 * @param {String} rawOutput - The raw text output from the chatbot.
 * @returns {Array<Object>} - A formatted output array containing role-based content.
 */
const formatOutput = (rawOutput) => {
    const lines = rawOutput.split("\n");
    const formattedOutput = [];
    let currentRole = null;
    let currentContent = '';
    lines.forEach(line => {
        if(line.startsWith("system") || line.startsWith("user") || line.startsWith("assistant")){
            if(currentContent){
                formattedOutput.push({
                    role: currentRole.trim(),
                    content: currentContent.trim(),
                });
            }
            currentRole = line.trim();
            currentContent = '';
        }else{
            currentContent += ' ' + line.trim();
        }
    });
    if(currentContent){
      formattedOutput.push({ role: currentRole.trim() || 'user', content: currentContent.trim() });
    }
    let finalOutput = new Array();
    finalOutput.push({
        generated_text: formattedOutput
    });
    return finalOutput;
};

/**
 * @brief Handles streaming chat requests with optional tools, documents, and templates.
 * @param {Array<Object>} messages - Chat history or input messages. (with role and content)
 * @param {Function} callback - Callback to process streamed chunks of text.
 * @param {Object} options - Additional options.
 * @param {Array<Object>} [options.tools=null] - JSON schema of tools for the model.
 * @param {Array<String>} [options.documents=null] - Documents to reference during chat. (titles of documents)
 * @param {String} [options.chat_template=null] - Template string to format the chat. (@huggingface/jinja)
 * @returns {Promise<Array<Object>>} - Formatted response containing role-based text content.
 */
export const streamingChat = async (messages, callback, {tools = null, documents = null, chat_template = null}) => {
    let chatbot = await ChatBot.getInstance();
    const streamer = new TextStreamer(chatbot.tokenizer, {
        skip_prompt: true,
        callback_function: callback
    });
    if(tools && documents && chat_template){
        const conversations = await chatbot.tokenizer.apply_chat_template(
            messages,
            {
                chat_template: chat_template,
                tokenize: false,
                add_generation_prompt: true,
                tools: tools,
                documents: documents
            });
        const output = await chatbot(conversations, {
            max_new_tokens: 256,
            do_sample: false,
            streamer
        });
        return formatOutput(output[0].generated_text);
    }
    const output = await chatbot(messages, {
        max_new_tokens: 256,
        do_sample: false,
        streamer
    });
    return output;
};
/**
 * @brief Handles regular (non-streaming) chat requests with optional tools, documents, and templates.
 * @param {Array<Object>} messages - Chat history or input messages. (with role and content)
 * @param {Object} options - Additional options.
 * @param {Array<Object>} [options.tools=null] - JSON schema of tools for the model.
 * @param {Array<String>} [options.documents=null] - Documents to reference during chat. (titles of documents)
 * @param {String} [options.chat_template=null] - Template string to format the chat. (@huggingface/jinja)
 * @returns {Promise<Array<Object>>} - Formatted response containing role-based text content.
 */
export const chat = async (messages, {tools = null, documents = null, chat_template = null}) => {
    let chatbot = await ChatBot.getInstance();
    if(tools && documents && chat_template){
        const conversations = await chatbot.tokenizer.apply_chat_template(
            messages,
            {
                chat_template: chat_template,
                tokenize: false,
                add_generation_prompt: true,
                tools: tools,
                documents: documents
            });
        const output = await chatbot(conversations, {
            max_new_tokens: 256,
            do_sample: false
        });
        return formatOutput(output[0].generated_text);
    }
    const output = await chatbot(messages, {
        max_new_tokens: 256,
        do_sample: false
    });
    return output;
};

export default { CACHE_KEY, ChatBot, chat, streamingChat, isGPUAvailable };

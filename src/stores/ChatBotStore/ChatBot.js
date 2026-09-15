import { pipeline } from '@huggingface/transformers';
import { env } from '@huggingface/transformers';
import { TextStreamer } from '@huggingface/transformers';
import { mean_pooling } from '@huggingface/transformers';

import { ModelCache, isGPUAvailable } from '../AIUtils';
import { HfInference } from '@huggingface/inference';
import { Template } from "@huggingface/jinja";

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
 * @brief Formats the raw output of the chatbot into structured JSON for both standard and server-specific formats.
 * @param {String} rawInput - The raw text output from the chatbot.
 * @returns {Array<Object>} - A formatted output array containing role-based content.
 */
const formatToChatML = (rawInput) => {
    const lines = rawInput.split("\n");
    const formattedOutput = [];
    let currentRole = null;
    let currentContent = '';
    const isServerFormat = rawInput.includes("<|im_start|>");

    const extractRole = (line) => {
        if(isServerFormat){
            return line.replace("<|im_start|>", "").trim();
        }
        return line.trim();
    };

    const isRoleLine = (line) => {
        if(isServerFormat){
            return line.startsWith("<|im_start|>");
        }
        return line.startsWith("system") || line.startsWith("user") || line.startsWith("assistant");
    };

    lines.forEach(line => {
        if(isRoleLine(line)){
            if(currentContent){
                formattedOutput.push({
                    role: currentRole.trim(),
                    content: currentContent.replace("<|im_end|>", "").trim(),
                });
            }
            currentRole = extractRole(line);
            currentContent = '';
        }else{
            currentContent += ' ' + line.trim();
        }
    });
    if (currentContent) {
        formattedOutput.push({
            role: currentRole.trim() || 'user',
            content: currentContent.replace("<|im_end|>", "").trim(),
        });
    }
    return formattedOutput;
};

/**
 * @brief Injects the system message with tools and documents into chat history and formats them with chatML.
 * @param {Array<Object>} messages - The original chat history to process.
 * @param {Object} tools - The tools to include in the system message.
 * @param {Object} documents - The documents to include in the system message.
 * @param {String} chat_template - The chatML template string for formatting.
 * @returns {Array<Object>|String} - The processed chat history or rendered chatML template.
 */
const injectSystemMessageWithToolsAndDocuments  = (messages, chat_template, tools, documents) => {
    let conversations = messages;
    if (tools && documents && chat_template) {
        const template = new Template(chat_template);
        conversations = formatToChatML(template.render({
            messages: messages,
            tools: tools,
            documents: documents,
            add_generation_prompt: true
        }));
    }
    return conversations;
};
/**
 * @brief Handles server side streaming chat requests with optional tools, documents, and templates.
 * @param {Array<Object>} messages 
 * @param {Object} remoteOptions - options for remote server.
 * @param {String} remoteOptions.url - url for backend
 * @param {String} remoteOptions.api_key - api key for backend access
 * @param {Number} remoteOptions.max_tokens - max tokens to generate
 * @param {Number} remoteOptions.temperature - temperature higher (1.0) for more randomness and lower(0.1) for less
 * @param {Number} remoteOptions.min_p - Filters out tokens with probabilities below this threshold. Range: 0.0 to 1.0.
 * @param {Number} remoteOptions.top_p - Uses nucleus sampling to consider tokens until cumulative probability exceeds this value. Range: 0.0 to 1.0.
 * @param {Number} remoteOptions.top_k - Limits token selection to the top K most probable tokens.
 * @param {String} remoteOptions.model - model to use if supported.
 * @param {Object} options - Additional options.
 * @param {Array<Object>} [options.tools=null] - JSON schema of tools for the model.
 * @param {Array<String>} [options.documents=null] - Documents to reference during chat. (Array of documents titles)
 * @param {String} [options.chat_template=null] - Template string to format the chat. (@huggingface/jinja)
 * @returns {String} - response of llm
 */
export const rStreamingChat = async (messages, callback, 
                                    { url= "http://localhost:8080", api_key = "sk-no-key-required", 
                                    max_tokens = 256, temperature = 0.4, min_p = 0.05, top_p=0.95, top_k = 1, 
                                    model="HuggingFaceTB/SmolLM2-135M-Instruct" }, 
                                    {tools = null, documents = null, chat_template = null }) => {
    const hf = new HfInference(api_key).endpoint(url);
    let out = "";
    let conversations = injectSystemMessageWithToolsAndDocuments(messages, chat_template, tools, documents);
    for await(const chunk of hf.chatCompletionStream(
        {
            model: model,
            messages: conversations,
            max_tokens: max_tokens,
            temperature: temperature,
            min_p: min_p,
            top_p: top_p,
            top_k: top_k
        })){
            if(chunk.choices && chunk.choices.length > 0){
                if(chunk.choices[0].delta.content){
                    out += chunk.choices[0].delta.content;
                    callback(chunk.choices[0].delta.content);
                }
            }
    }
    return out;
};
/**
 * @brief Handles streaming chat requests with optional tools, documents, and templates.
 * @param {Array<Object>} messages - Chat history or input messages. (with role and content)
 * @param {Function} callback - Callback to process streamed chunks of text. (text) => { console.log(text) }
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
    let conversations = messages;
    if(tools && documents && chat_template){
        conversations = await chatbot.tokenizer.apply_chat_template(
            messages,
            {
                chat_template: chat_template,
                tokenize: false,
                tools: tools,
                documents: documents,
                add_generation_prompt: true
            });
        const output = await chatbot(conversations, {
            max_new_tokens: 256,
            do_sample: false,
            streamer
        });
        let finalOutput = new Array();
        finalOutput.push({
            generated_text: formatToChatML(output[0].generated_text)
        });
        return finalOutput;
    }
    const output = await chatbot(conversations, {
        max_new_tokens: 256,
        do_sample: false,
        streamer
    });
    return output;
};

/**
 * @brief Handles server side chat requests with optional tools, documents, and templates.
 * @param {Array<Object>} messages 
 * @param {Object} remoteOptions - options for remote server.
 * @param {String} remoteOptions.url - url for backend
 * @param {String} remoteOptions.api_key - api key for backend access
 * @param {Number} remoteOptions.max_tokens - max tokens to generate
 * @param {Number} remoteOptions.temperature - temperature higher (1.0) for more randomness and lower(0.1) for less
 * @param {Number} remoteOptions.min_p - Filters out tokens with probabilities below this threshold. Range: 0.0 to 1.0.
 * @param {Number} remoteOptions.top_p - Uses nucleus sampling to consider tokens until cumulative probability exceeds this value. Range: 0.0 to 1.0.
 * @param {Number} remoteOptions.top_k - Limits token selection to the top K most probable tokens.
 * @param {String} remoteOptions.model - model to use if supported.
 * @param {Object} options - Additional options.
 * @param {Array<Object>} [options.tools=null] - JSON schema of tools for the model.
 * @param {Array<String>} [options.documents=null] - Documents to reference during chat. (Array of documents titles)
 * @param {String} [options.chat_template=null] - Template string to format the chat. (@huggingface/jinja)
 * @returns {String} - response of llm
 */
export const rChat = async (messages, { url= "http://localhost:8080", api_key = "sk-no-key-required", 
                            max_tokens = 256, temperature = 0.4, min_p = 0.05, top_p=0.95, top_k = 1, 
                            model="HuggingFaceTB/SmolLM2-135M-Instruct" }, 
                            {tools = null, documents = null, chat_template = null }) => {
        const hf = new HfInference(api_key).endpoint(url);
        let conversations = injectSystemMessageWithToolsAndDocuments(messages, chat_template, tools, documents);
        let message = (await hf.chatCompletion({
            model: model,
            messages: conversations,
            max_tokens: max_tokens,
            temperature: temperature,
            min_p: min_p,
            top_p: top_p,
            top_k: top_k
        })).choices[0].message;
        return message.content;
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
        let finalOutput = new Array();
        finalOutput.push({
            generated_text: formatToChatML(output[0].generated_text)
        });
        return finalOutput;
    }
    const output = await chatbot(messages, {
        max_new_tokens: 256,
        do_sample: false
    });
    return output;
};
/**
 * @brief Extracts sentence embeddings from input text.
 * @param {String} text - text to convert to embeddings 
 * @returns {Array<Float32>}
 */
export const getEmbeddings = async (text) => {
    let chatbot = await ChatBot.getInstance();
    const inputs = await chatbot.tokenizer(text, { padding: true, truncation: true });
    const output = await chatbot.model(inputs, { output_hidden_states: true });
    let embedding = output.last_hidden_states ?? output.logits ?? output.token_embeddings;
    let sentenceEmbedding = mean_pooling(embedding.normalize(2, -1), inputs.attention_mask);
    return Array.from(sentenceEmbedding.data);
};

/**
 * @brief Extracts sentence embeddings from input text.
 * @param {String} text - text to convert to embeddings
 * @param {Object} remoteOptions - options for remote server.
 * @param {String} remoteOptions.url - url for backend
 * @param {String} remoteOptions.api_key - api key for backend access
 * @param {String} remoteOptions.model - model to use if supported.
 * @returns {Array<Float32>}
 */
export const getREmbeddings = async (text, remoteOptions = {
    url: "http://localhost:8080",
    api_key: "sk-key-not-needed",
    model: "HuggingFaceTB/SmolLM2-135M-Instruct",
    }) => {
        const fullUrl = remoteOptions.url + "/v1/embeddings";
        const hf = new HfInference(remoteOptions.api_key).endpoint(fullUrl);
        let response = await hf.request({
            model: remoteOptions.model,
            content: text
        });
        let index = response[0].index;
        return response[0].embedding[index];
};

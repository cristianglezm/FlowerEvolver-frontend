import { useFlowerStore } from "./FlowerStore";
import { useCaptionerStore } from "./CaptionerStore";
import { useRouter } from "vue-router";
import { useVectorStore } from "./vectorStore";

// we need this global router initialized in the App to be 
// able to use goto as useRouter needs to be inside a <script setup>
let router;
// we need this global emitter initialized in the App to be 
// able to use describe (to show and update the DescriptionModal).
let emitter;
export const initRouter = () => {
    router = useRouter();
};
export const initEmitter = (channel) => {
    emitter = channel;
}
export const execCommand = (text) => {
    let infoForUser = new Array();
    let textForUser = new Array();
    let commandsToConfirm = new Array();
    const makeResult = (textForUser = [], commandsToConfirm = [], infoForUser = []) => {
        return {
            infoForUser: infoForUser,
            textForUser: textForUser,
            commandsToConfirm: commandsToConfirm
        };
    };
    if(text === undefined || text === null){
        infoForUser.push("response was not valid.");
        return makeResult(textForUser, commandsToConfirm, infoForUser);
    }
    let regex = /<tool_call>(.*?)<\/tool_call>/;
    let matches = text.match(regex);
    if(!matches){
        textForUser.push(text);
        return makeResult(textForUser, commandsToConfirm, infoForUser);
    }
    let command;
    try{
        command = JSON.parse(matches[1]);
        let cleanText = text.replace(regex, "").trim();
        if(cleanText){
            textForUser.push(cleanText);
        }
    }catch(_){
        infoForUser.push("I am sorry but I could not parse the command.");
        return makeResult(textForUser, commandsToConfirm, infoForUser);
    }
    for(let i=0;i<command.length;++i){
        switch(command[i].name){
            case "getDocument":{
                const vectorStore = useVectorStore();
                const title = command[i].parameters?.title;
                if(title){
                    if(vectorStore.hasDocument(title)){
                        infoForUser.push("I got the information requested for you.");
                        textForUser.push(`${vectorStore.getDocument(title)}`);
                    }else{
                        infoForUser.push("sorry, I am afraid I don't know the information requested.");
                    }
                }else{
                    infoForUser.push("title was not valid");
                }
            }
                break;
            case "describe":{
                const CaptionerStore = useCaptionerStore();
                const FlowerStore = useFlowerStore();
                let flowerID = command[i].parameters?.id;
                if(flowerID){
                    FlowerStore.db.flowers.get(flowerID)
                    .then((flower) => {
                        const numPreload = 5;
                        let lower = flower.id - numPreload;
                        let offset = Math.min(flower.id - 1, Math.max(lower, 0));
                        // preload descriptions around the flower we want numPreload * 2
                        CaptionerStore.loadAndConcatLocalDescriptions(offset, numPreload * 2)
                        .then(() => {
                            // give a bit of time for cache to fill in.
                            setTimeout(() => {
                                if(CaptionerStore.localDescriptions.has(flower.id)){
                                    if(emitter){
                                        emitter.emit('showDescriptionModal', {
                                            FlowerImage: flower.image,
                                            FlowerID: flower.id
                                        });
                                        // give time for descriptionsModal to show up
                                        setTimeout(() => {
                                            emitter.emit('updateDesc', {
                                                loading: false,
                                                description: CaptionerStore.getLocalDescription(flower.id)
                                            });
                                        }, 500);
                                    }
                                    infoForUser.push("describe command executed");
                                }else{
                                    if(CaptionerStore.isModelLoaded){
                                        CaptionerStore.requestDescription({
                                            id: flower.id,
                                            image: flower.image,
                                            isLocal: true
                                        });
                                        if(emitter){
                                            emitter.emit('showDescriptionModal', {
                                                FlowerImage: flower.image,
                                                FlowerID: flower.id
                                            });
                                        }
                                        infoForUser.push("describe command executed");
                                    }else{
                                        infoForUser.push("please load the captioner model.");
                                    }
                                }
                            }, 500);
                        })
                    }).catch((_) => {
                        infoForUser.push("I am sorry I couldn't describe the flower because it was not found");
                    });
                }
            }
                break;
            case "goto":{
                if(!router){
                    throw Error("please call initRouter() in the App");
                }
                let path = command[i].parameters?.path;
                let fail = "sorry I could not execute command goto";
                let success = "goto command executed";
                if(path){
                    switch(path){
                        case "Mutations":{
                            let original = command[i].parameters?.pathParameters?.mutations?.id;
                            if(original){
                                router.push({name:'Mutations', params:{id: original, isLocal: true}});
                                infoForUser.push(success);
                            }else{
                                infoForUser.push("goto Mutations: Flower id not given");
                                infoForUser.push(fail);
                            }
                        }
                            break;
                        case "Descendants":{
                            let father = command[i].parameters?.pathParameters?.descendants?.father;
                            let mother = command[i].parameters?.pathParameters?.descendants?.mother;
                            if(father && mother){
                                router.push({name:'DescendantsFatherAndMother', params:{father: father, mother: mother, isLocal: "local"}});
                                infoForUser.push(success);
                            }else if(father){
                                router.push({name:'DescendantsFatherOrMother', params:{father:father, isLocal: "local"}});
                                infoForUser.push(success);
                            }else{
                                infoForUser.push("father or mother id not given");
                                infoForUser.push(fail);
                            }
                        }
                            break;
                        default:{
                            router.push({name: path });
                            infoForUser.push(success);
                        }
                            break;
                    }
                }else{
                    infoForUser.push("goto: path was not found");
                }
            }
                break;
            case "reproduce":{
                let FlowerStore = useFlowerStore();
                let father = command[i].parameters?.father;
                let mother = command[i].parameters?.mother;
                let fail = "reproduce command failed";
                let success = "reproduce command executed";
                if(father && mother){
                    FlowerStore.selectLocalFlower({ id: father});
                    FlowerStore.selectLocalFlower({ id: mother});
                    FlowerStore.localReproduce();
                    infoForUser.push(success);
                }else{
                    infoForUser.push("reproduce: father or mother id not given, need both ids.");
                    infoForUser.push(fail);
                }
            }
                break;
            case "mutate":{
                let FlowerStore = useFlowerStore();
                let original = command[i].parameters?.id;
                let fail = "mutate command failed.";
                let success = "mutate command executed.";
                if(original){
                    FlowerStore.db.flowers.get(original)
                    .then((flower) => {
                        FlowerStore.makeLocalMutation(flower);
                    }).catch((_) => {
                        infoForUser.push("mutate command not executed, Flower not found");
                    });
                    infoForUser.push(success);
                }else{
                    infoForUser.push("mutate: flower id not given");
                    infoForUser.push(fail);
                }
            }
                break;
            case "makeFlower":{
                let FlowerStore = useFlowerStore();
                FlowerStore.makeLocalFlower();
                infoForUser.push("makeFlower command executed");
            }
                break;
            case "addToFav":{
                let FlowerStore = useFlowerStore();
                let fail = "addToFavs command failed";
                let success = "addToFavs command executed";
                let id = command[i].parameters?.id;
                if(id){
                    FlowerStore.addFlowerToFav(id);
                    infoForUser.push(success);
                }else{
                    infoForUser.push("Flower id not found");
                    infoForUser.push(fail);
                }
            }
                break;
            case "deleteFromFav":{
                let FlowerStore = useFlowerStore();
                let fail = "deleteFromFav command failed";
                let success = "deleteFromFav requested confirmation";
                let id = command[i].parameters?.id;
                if(id){
                    commandsToConfirm.push({
                        title: `remove flower with id ${id} from favourites`,
                        message: 'Are you sure you want to remove it from favourites?',
                        btnNo: 'no',
                        btnYes: 'remove flower from favourites',
                        onConfirm: async () => {
                            FlowerStore.removeFlowerFromFav(id);
                        }
                    });
                    infoForUser.push(success);
                }else{
                    infoForUser.push("deleteFromFav: id not given");
                    infoForUser.push(fail);
                }
            }
                break;
            case "deleteFlower":{
                let FlowerStore = useFlowerStore();
                let fail = "deleteFlower command failed";
                let success = "deleteFlower requested confirmation";
                let id = command[i].parameters?.id;
                if(id){
                    commandsToConfirm.push({
                        title: `delete flower with id ${id}`,
                        message: `Are you sure you want to delete flower with id ${id}?`,
                        btnNo: 'no',
                        btnYes: 'Delete flower',
                        onConfirm: async () => {
                            FlowerStore.deleteLocalFlower(id);
                        }
                    });
                    infoForUser.push(success);
                }else{
                    infoForUser.push("deleteFlower: id not given");
                    infoForUser.push(fail);
                }
            }
                break;
            case "deleteAllFlowers":{
                let success = "deleteAllFlowers requested confirmation";
                let FlowerStore = useFlowerStore();
                commandsToConfirm.push({
                        title: 'delete all flowers',
                        message: 'Are you sure you want to delete all flowers?',
                        btnNo: 'no',
                        btnYes: 'Delete all',
                        onConfirm: async () => {
                            await FlowerStore.deleteAllFlowers();
                        }
                });
                infoForUser.push(success);
            }
                break;
            case "deleteNonFavourites":{
                let success = "deleteNonFavourites requested confirmation";
                let FlowerStore = useFlowerStore();
                commandsToConfirm.push({
                    title: 'Delete non favourites',
                    message: 'Are you sure you want to delete all flowers but favourites?',
                    btnNo: 'no',
                    btnYes: 'Delete non favourites',
                    onConfirm: async () => {
                        await FlowerStore.deleteNonFavourites();
                    }
                });
                infoForUser.push(success);
            }
                break;
            default: infoForUser.push("unknown command " + command[i].name);
        }
    }
    return makeResult(textForUser, commandsToConfirm, infoForUser);
};
export const tools = [
    {
        "name": "makeFlower",
        "description": "Makes a flower",
        "parameters": {}
    },
    {
        "name": "mutate",
        "description": "Mutates a flower given the ID",
        "parameters": {
            "id": {
                "description": "Flower ID",
                "type": "int",
                "required": true
            }
        }
    },
    {
        "name": "reproduce",
        "description": "Reproduces a couple of flowers",
        "parameters": {
            "father": {
                "description": "ID for the father flower",
                "type": "int",
                "required": true
            },
            "mother": {
                "description": "ID for the mother flower",
                "type": "int",
                "required": true
            }
        }
    },
    {
        "name": "addToFav",
        "description": "adds the flower to favourites given the ID",
        "parameters": {
            "id": {
                "description": "Flower ID",
                "type": "int",
                "required": true
            }
        }
    },
    {
        "name": "deleteFromFav",
        "description": "deletes a flower from favourites given the ID",
        "parameters": {
            "id": {
                "description": "Flower ID",
                "type": "int",
                "required": true
            }
        }
    },
    {
        "name": "deleteFlower",
        "description": "deletes a flower given the ID",
        "parameters": {
            "id": {
                "description": "Flower ID",
                "type": "int",
                "required": true
            }
        }
    },
    {
        "name": "deleteAllFlowers",
        "description": "deletes all flowers",
        "parameters": {}
    },
    {
        "name": "deleteNonFavourites",
        "description": "deletes all flowers that are not marked as favourites",
        "parameters": {}
    },
    {
        "name": "describe",
        "description": "Describes the flower given by ID",
        "parameters": {
            "id": {
                "description": "ID for the flower to describe",
                "type": "int",
                "required": true
            }
        }
    },
    {
        "name": "goto",
        "description": "It goes to the route given",
        "parameters": {
            "path": {
                "description": "Name of path to go",
                "enum": [
                    "Local",
                    "LastAdded",
                    "Browse",
                    "Favourites",
                    "Downloads",
                    "Settings",
                    "Mutations",
                    "Descendants"
                ],
                "type": "string",
                "required": true
            },
            "pathParameters": {
		"type": "object",
		"required": true,
                "description": "Required parameters for Mutations, Descendants",
                "mutations": {
                    "id": {
                        "description": "Flower ID",
                        "type": "int",
                        "required": true
                    }
                },
                "descendants": {
                    "father": {
                        "description": "Father ID",
                        "type": "int",
                        "required": true
                    },
                    "mother": {
                        "description": "Mother ID",
                        "type": "int",
                        "required": false
                    }
                }
            }
        }
    },
    {
        "name": "getDocument",
        "description": "It requests info for the user",
        "parameters": {
            "title": {
                "description": "Title of the document (aka key)",
                "type": "string",
                "required": true
            }
        }
    }
];
export const documents = [
    {
        "title": "How do I make a new flower?",
        "content": "To make a new flower, navigate to the 'Local' tab and use the 'local make flower' button. This will create a new flower with parameters set in the 'Settings' tab."
    },
    {
        "title": "How can I see the descendants of a flower?",
        "content": "To view the descendants of a flower, select the flower in the 'Local' tab and use the 'remote show descendants' button. This option will become 'local show descendants' when you are in the Local, Settings, or Favourites tabs."
    },
    {
        "title": "What is the function of the Favourites tab?",
        "content": "The Favourites tab displays flowers that you have marked with a heart icon. These are flowers you want to keep track of for easy access."
    },
    {
        "title": "How do I export my flowers?",
        "content": "You can export your flowers by using the 'export' options available in the 'Settings' tab. There are options to export local flowers, favourites, and garden flowers."
    },
    {
        "title": "Can I delete all my flowers?",
        "content": "Yes, you can delete all your flowers by using the 'delete all flowers' option in the 'Settings' tab. There is also an option to delete non-favourites only."
    },
    {
        "title": "How do I change the creation parameters?",
        "content": "Go to the 'Settings' tab to adjust creation parameters such as radius, number of layers, P, and bias. You can also change mutation rates and other settings there."
    },
    {
        "title": "What is the Chatbot feature?",
        "content": "The Chatbot is a widget that allows you to interact with a bot to perform actions on the website. It has an expand button, is draggable, and has an LED indicator showing its status (red for not loaded, lime for loaded). You can access it from the bar with buttons at the bottom of the page."
    },
    {
        "title": "How do I load demo flowers?",
        "content": "In the 'Settings' tab, you can load demo flowers by selecting the 'load demo flowers' option. This will load 42 flowers selected for demonstration purposes."
    },
    {
        "title": "What are model options?",
        "content": "Model options allow you to select models for the captioner and chatbot, with options for quants, CPU, or GPU. These can be configured in the 'Settings' tab."
    },
    {
        "title": "How can I see the mutations of a flower?",
        "content": "To view the mutations of a flower, select the flower in the 'Local' tab and use the 'show mutations' option from the menu indicated by an up arrow."
    },
    {
        "title": "How do I change pagination settings?",
        "content": "In the 'Settings' tab, you can configure pagination settings, including the limit for page size or enabling infinite scroll."
    },
    {
        "title": "How do I share a flower?",
        "content": "To share a flower, go to the 'Local' tab, select the flower, and use the 'share' option from the menu indicated by an up arrow."
    },
    {
        "title": "How do I delete a specific flower?",
        "content": "To delete a specific flower, navigate to the 'Local' tab, select the flower, and use the 'delete flower' option from the menu indicated by an up arrow."
    },
    {
        "title": "How do I download the genome of a flower?",
        "content": "To download the genome of a flower, select the flower in the 'Local' tab and use the 'download image/genome' option from the menu indicated by an up arrow."
    },
    {
        "title": "How do I select a flower?",
        "content": "To select a flower, go to the 'Local' tab and use the 'select flower' option from the menu indicated by an up arrow."
    },
    {
        "title": "How do I show the mutations of a flower?",
        "content": "To show the mutations of a flower, select the flower in the 'Local' tab and use the 'show mutations' option from the menu indicated by an up arrow."
    },
    {
        "title": "How do I show the descendants of a flower?",
        "content": "To show the descendants of a flower, select the flower in the 'Local' tab and use the 'show descendants' option from the menu indicated by an up arrow."
    },
    {
        "title": "How do I redraw a flower?",
        "content": "To redraw a flower, select the flower in the 'Local' tab and use the 'redraw flower' option from the menu indicated by an up arrow. This will create a new flower with the current settings parameters."
    },
    {
        "title": "How do I add a flower to favourites?",
        "content": "To add a flower to favourites, select the flower in any tab and click on the heart icon. This will mark the flower as a favourite and it will appear in the 'Favourites' tab."
    },
    {
        "title": "How do I describe a flower?",
        "content": "To describe a flower, select the flower in the 'Local' tab and use the 'describe' option from the menu indicated by an up arrow."
    },
    {
        "title": "What is the Downloads tab for?",
        "content": "The Downloads tab contains the native app and a video demonstrating its usage."
    },
    {
        "title": "What are mutation rates?",
        "content": "Mutation rates are parameters in the 'Settings' tab that control how often specific genetic changes occur during the evolution of flowers. These include rates for adding nodes, adding connections, removing connections, perturbing weights, enabling/disabling genes, and changing activation types."
    },
    {
        "title": "How do I export local flowers?",
        "content": "To export local flowers, go to the 'Settings' tab and use the 'export local flowers' option."
    },
    {
        "title": "How do I export favourite flowers?",
        "content": "To export favourite flowers, go to the 'Settings' tab and use the 'export favourites' option."
    },
    {
        "title": "How do I export garden flowers?",
        "content": "To export garden flowers, go to the 'Settings' tab and use the 'export garden flowers' option."
    },
    {
        "title": "How do I export data for the native app?",
        "content": "To export data for the native app, go to the 'Settings' tab and use the 'export' options provided. This will allow you to use the data within the native app."
    },
    {
        "title": "How do I redraw all flowers with current parameters?",
        "content": "To redraw all flowers with the current parameters, go to the 'Settings' tab and use the 'redraw all flowers' option."
    },
    {
        "title": "How do I delete non-favourite flowers?",
        "content": "To delete non-favourite flowers, go to the 'Settings' tab and use the 'delete non-favourites' option."
    },
    {
        "title": "How do I use the native app?",
        "content": "Instructions for using the native app can be found in the 'Downloads' tab, along with a video demonstrating its usage."
    },
    {
        "title": "What is the purpose of the Settings tab?",
        "content": "The Settings tab allows users to configure various parameters related to flower creation, mutation rates, pagination options, and model loading preferences. It also provides options for exporting and importing data, and managing storage quotas."
    },
    {
        "title": "Why should I mark a flower as a favourite?",
        "content": "Marking a flower as a favourite makes it easier to find and manage. Favourite flowers are displayed in the Favourites tab, allowing quick access and special actions like exporting or preventing deletion when using bulk delete options."
    },
    {
        "title": "Where can I find the video tutorial?",
        "content": "The video tutorial demonstrating how to use the native app is available in the Downloads tab."
    },
    {
        "title": "What does the LED indicator on the chatbot mean?",
        "content": "The LED indicator on the chatbot widget shows the status of the chatbot model. A red light indicates the model is not loaded, while a lime light means the model is loaded and ready for use."
    },
    {
        "title": "Can I load a specific model for the captioner?",
        "content": "Yes, in the Settings tab, you can select the model for the captioner, with options for different quantization levels and processing on CPU or GPU."
    },
    {
        "title": "What happens when I redraw all flowers?",
        "content": "Redrawing all flowers will regenerate them using the current parameters set in the Settings tab. This can give them new appearances based on the updated settings."
    },
    {
        "title": "Why is the 'remote' button label changing?",
        "content": "The 'remote' button labels change depending on your current tab. For example, 'remote make flowers' becomes 'local make flower' when you are in the Local, Settings, or Favourites tabs to reflect the context of actions you can perform."
    },
    {
        "title": "How do I handle storage quota issues?",
        "content": "In the Settings tab, you can manage your storage quota by deleting unnecessary flowers and models. You can also enable persistent storage options to better manage your resources."
    },
    {
        "title": "What are the benefits of loading demo flowers?",
        "content": "Loading demo flowers provides a curated set of 42 flowers that showcase different features and configurations. It's a good way to explore and learn about the capabilities of the application."
    },
    {
        "title": "Why should I use the pagination options?",
        "content": "Using pagination options helps manage the display of flowers, especially when dealing with large datasets. You can configure it to limit the number of flowers per page or enable infinite scroll for a seamless browsing experience."
    }
];
const keys = (documents) => {
    return documents.map((doc) => `"${doc.title}"`);
};
export const chat_template = "{% for message in messages %}{% if loop.first and messages[0]['role'] != 'system' %}{{ '<|im_start|>system\nYou are an expert in composing functions. Based on the given question and tools, make functions/tools call to achieve the purpose, if applicable. If no suitable tool exists or the question lacks required parameters, state this clearly.\n<tools>' }}{{ tools|tojson }}{{ '</tools>\n<docs_titles>' }}{% for doc in documents %}{{ doc }}{% if not loop.last %}, {% endif %}{% endfor %}{{ '</docs_titles>\nresponse format:\n<tool_call>[{\"name\": \"fn_name\", \"parameters\": {\"param\": \"value\"}}, ...]</tool_call>\n<|im_end|>\n' }}{% endif %}{{ '<|im_start|>' + message['role'] + '\n' + message['content'] + '<|im_end|>\n' }}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\n' }}{% endif %}"
export const system_prompt = `You are an expert in composing functions. 
             Based on the given question and tools, make functions/tools call to achieve the purpose, 
            if applicable. If no suitable tool exists or the question lacks required parameters, state this clearly.
            <tools>
                ${JSON.stringify(tools)}
            </tools>
            <docs_titles>
                ${keys(documents)}
            </docs_titles>
            response format:
            <tool_call>[{"name": "fn_name", "parameters": {"param": "value"}}, ...]</tool_call>`;
export default { execCommand, tools, documents, system_prompt, chat_template };

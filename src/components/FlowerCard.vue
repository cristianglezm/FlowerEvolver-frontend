<template>
  <div class="FlowerCard">
    <div v-if="props.isLocal">
      <div class="flowerMenu" :class="{Selected: data.selected}">
        <img v-if="!data.clicked" class="drop-menu pointer" src="@/assets/x32/Arrow_down.png" @click="data.clicked = !data.clicked; ">
        <img v-if="data.clicked" class="drop-menu pointer" src="@/assets/x32/Arrow_up.png" @click="data.clicked = !data.clicked; ">
        <div style="width: 100%;height: 100%;display: flex;justify-content: end;">
          <img :key="props.id" class="pointer" alt="favourite button" :src="data.heartIconSrc" @click="toggleFavourite(props.id)">
          <ParamsInfo :params="data.params" />
        </div>
        <div v-if="data.clicked" class="flower-buttons">
          <a @click="mutate(); data.clicked = !data.clicked;">Mutate</a>
          <a @click="onSelected(); data.clicked = !data.clicked;">Select Flower</a>
          <a @click="shareFlower(); data.clicked = !data.clicked;">Share</a>
          <a @click="describe(); data.clicked = !data.clicked;">Describe</a>
          <a @click="downloadGenome(); data.clicked = !data.clicked;">Download Genome</a>
          <a @click="downloadImage(); data.clicked = !data.clicked;">Download Image</a>
          <a @click="showMutations(); data.clicked = !data.clicked;">Show Mutations</a>
          <a @click="showAncestors(); data.clicked = !data.clicked;">Show Descendants</a>
          <a @click="deleteThisFlower(); data.clicked = !data.clicked;">Delete Flower</a>
          <a @click="FlowerStore.redrawFlower({genome: props.genome}); data.clicked = !data.clicked;">Redraw Flower</a>
        </div>
      </div>
      <img :id="'FlImage' + props.id" loading="lazy" :src="getImage()" :alt="data.description" class="FlowerImage">
      <p><strong>{{ props.id }}</strong></p>
    </div>
    <div v-else>
      <div class="flowerMenu" :class="{Selected: data.selected}">
        <img v-if="!data.clicked" class="drop-menu pointer" src="@/assets/x32/Arrow_down.png" @click="data.clicked = !data.clicked; ">
        <img v-if="data.clicked" class="drop-menu pointer" src="@/assets/x32/Arrow_up.png" @click="data.clicked = !data.clicked; ">
        <div style="width: 100%;height: 100%;display: flex;justify-content: end;">
          <img :key="props.id" class="pointer disabled" alt="disabled favourite button" :src="data.heartIconSrc">
          <ParamsInfo :params="data.params" />
        </div>
        <div v-if="data.clicked" class="flower-buttons">
          <a @click="mutate(); data.clicked = !data.clicked;">Mutate</a>
          <a @click="onSelected(); data.clicked = !data.clicked;">Select Flower</a>
          <a @click="addToLocal(); data.clicked = !data.clicked;">Add to local</a>
          <a @click="describe(); data.clicked = !data.clicked;">Describe</a>
          <a @click="downloadGenome(); data.clicked = !data.clicked;">Download Genome</a>
          <a @click="downloadImage(); data.clicked = !data.clicked;">Download Image</a>
          <a @click="showMutations(); data.clicked = !data.clicked;">Show Mutations</a>
          <a @click="showAncestors(); data.clicked = !data.clicked;">Show Descendants</a>
        </div>
      </div>
      <img :id="'FlImage' + props.id" loading="lazy" :src="getImage()" :alt="data.description" class="FlowerImage">
      <p><strong>{{ props.id }}</strong></p>
    </div>
  </div>
</template>

<script setup>

    import { useFlowerStore } from '../stores/FlowerStore';
    import { useCaptionerStore } from '../stores/CaptionerStore';
    import { onMounted, reactive, inject, onUnmounted } from 'vue';
    import { useRouter } from 'vue-router';
    import ParamsInfo from './ParamsInfo.vue';

    const props = defineProps({
        id: {
            type: Number,
            required: true,
            default: 0
        },
        genome: {
            type: String,
            required: true,
            default: ""
        },
        image: {
            type: String,
            required: true,
            default: ""
        },
        isLocal: {
            type: Boolean,
            required: true,
            default: true
        }
    });
    const loadImage = (url, res) => {
        return new URL(`/src/assets/${res}/${url}`, import.meta.url);
    };
    const clamp = (val, min, max) => {
        return Math.min(max, Math.max(val, min));
    }
    const validateFloat = (number, Default) => {
        if(Number.isNaN(parseFloat(number))){
            return Default;
        }
        return number;
    };
    const parseParams = () => {
        if(props.genome === ""){
            return;
        }
        let json = JSON.parse(props.genome);
        data.params = json.Flower.petals;
        data.params.radius = clamp(data.params.radius, 4, 256);
        data.params.numLayers = Math.max(1, data.params.numLayers);
        data.params.P = validateFloat(data.params.P, 6.0);
        data.params.bias = validateFloat(data.params.bias, 1.0);
    };
    const data = reactive({
        IMAGES_URL: import.meta.env.VITE_APP_IMAGES_URL,
        DOWNLOAD_URL: import.meta.env.VITE_APP_DOWNLOAD_URL,
        description: "Flower " + props.id + " - click describe for a better description",
        clicked: false,
        selected: false,
        index: 0,
        heartIconSrc: loadImage("heart_empty.png","x32"),
        heartAnimation: [
                        loadImage("heart_empty.png","x32"),
                        loadImage("heart_filling0.png","x32"),
                        loadImage("heart_filling1.png","x32"),
                        loadImage("heart_filling2.png","x32"),
                        loadImage("heart_filling3.png","x32"),
                        loadImage("heart_filling4.png","x32"),
                        loadImage("heart_full.png","x32"),
                        ],
        params: {
                radius: 64,
                numLayers: 3,
                P: 6.0,
                bias: 1.0
                },
    });
    const router = useRouter();
    const FlowerStore = useFlowerStore();
    const CaptionerStore = useCaptionerStore();
    const emitter = inject('emitter');
    onMounted(() => {
        if(props.isLocal){
            parseParams();
            FlowerStore.isFavourited(props.id)
                .then((isFav) => {
                    if(isFav){
                        data.heartIconSrc = loadImage("heart_full.png","x32");
                    }
                });
            if(CaptionerStore.localDescriptions.has(props.id)){
                data.description = "Flower " + props.id + " - " + CaptionerStore.getLocalDescription(props.id);
            }
        }
        CaptionerStore.channel.on('captioner#done', (e) => {
            if(e.id === props.id){
                data.description = "Flower " + props.id + " - " + e.description;
                emitter.emit('updateDesc', {
                    loading: false,
                    description: e.description
                });
            }
        });
        data.selected = isSelected();
        emitter.on('checkSelected', () => {
            data.selected = isSelected();
        });
    });
    onUnmounted(() => {
        emitter.off('checkSelected');
        CaptionerStore.channel.off('captioner#done');
    });

    const deleteThisFlower = () => {
        emitter.emit('showYesNo', {
            title: 'Delete Action',
            message: 'Do you wanna delete flower ' + props.id + '?',
            btnNo: 'No',
            btnYes: 'Delete Flower',
            onConfirm: (dialog) => {
                FlowerStore.deleteLocalFlower(props.id);
                dialog.close();
            },
        });
    };
    const getImage = () => {
        if(props.isLocal){
            return props.image;
        }else{
            return data.IMAGES_URL + props.image;
        }
    };
    const onSelected = () => {
        if(props.isLocal){
            FlowerStore.selectLocalFlower({id: props.id, genome: props.genome,image: props.image});
        }else{
            FlowerStore.selectRemoteFlower({id: props.id, genome: props.genome,image: props.image});
        }
        emitter.emit('checkSelected');
    };
    const shareFlower = () => {
        FlowerStore.shareFlower(props.genome);
    };
    const describe = () => {
        if(!CaptionerStore.hasModelLoaded()){
            FlowerStore.errors.push({message: "check load model option or click download / load Model in Settings to use this."});
            return;
        }
        if(props.isLocal){
            if(CaptionerStore.localDescriptions.has(props.id)){
                emitter.emit('showDescriptionModal', {
                    FlowerImage: getImage(),
                    FlowerID: props.id
                });
                setTimeout(() => {
                    emitter.emit('updateDesc', {
                        loading: false,
                        description: CaptionerStore.getLocalDescription(props.id)
                    });
                }, 500);
            }else{
                CaptionerStore.requestDescription({ id: props.id, image: props.image, isLocal: props.isLocal });
                emitter.emit('showDescriptionModal', {
                    FlowerImage: getImage(),
                    FlowerID: props.id
                });
            }
        }else{
            if(CaptionerStore.remoteDescriptions.has(props.id)){
                emitter.emit('showDescriptionModal', {
                    FlowerImage: getImage(),
                    FlowerID: props.id
                });
                setTimeout(() => {
                    emitter.emit('updateDesc', {
                        loading: false,
                        description: CaptionerStore.getRemoteDescription(props.id)
                    });
                }, 500);
            }else{
                CaptionerStore.requestDescription({ id: props.id, image: props.image, isLocal: props.isLocal });
                emitter.emit('showDescriptionModal', {
                    FlowerImage: getImage(),
                    FlowerID: props.id
                });
            }
        }
    };
    const showMutations = () => {
        let localOr = props.isLocal ? "local":"remote";
        router.push({name:'Mutations', params:{id: props.id, isLocal: localOr}});
    };
    const showAncestors = () => {
        let localOr = props.isLocal ? "local":"remote";
        router.push({name:'DescendantsFatherOrMother', params:{father: props.id, isLocal: localOr}});
    };
    const isSelected = () => {
        if(props.isLocal){
            return FlowerStore.isLocalFlowerSelected({id: props.id, genome: props.genome, image: props.image})
        }
        return FlowerStore.isRemoteFlowerSelected({id: props.id, genome: props.genome, image: props.image})
    };
    const toggleFavourite = async (id) => {
        if(props.isLocal){
            let isFav = await FlowerStore.isFavourited(id);
            if(isFav){
                data.index = 6;
                setTimeout(changeHeartIcon, 50, true);
                FlowerStore.removeFlowerFromFav(id);
            }else{
                data.index = 0;
                setTimeout(changeHeartIcon, 50, false);
                await FlowerStore.addFlowerToFav(id);
            }
        }else{
            FlowerStore.errors.push({message: "Add the flower to local first to add it to favourites."});
        }
    };
    const addToLocal = () => {
        if(!props.isLocal){
            FlowerStore.addRemoteFlowerToLocal({id: props.id, genome: props.genome, image: props.image});
        }else{
            FlowerStore.errors.push({message: "This flower is a local flower already."});
        }
    };
    const changeHeartIcon = (desc) => {
        data.heartIconSrc = data.heartAnimation[data.index];
        if(data.index < 6 && !desc){
            data.index += 1;
            setTimeout(changeHeartIcon, 50, desc);
        }else if(data.index > 0 && desc){
            data.index -= 1;
            setTimeout(changeHeartIcon, 50, desc);
        }
    };
    const downloadGenome = () => {
        if(props.isLocal){
            const a = document.createElement("a");
            a.href = 'data:text/json;charset=utf-8,' + props.genome;
            a.download = "flower " + props.id + ".json";
            a.click();
        }else{
            window.location = data.DOWNLOAD_URL + props.genome;
        }
    };
    const downloadImage = () => {
        if(props.isLocal){
            const a = document.createElement("a");
            a.href = props.image;
            a.download = "flower " + props.id + ".png";
            a.click();
        }else{
            window.location = data.DOWNLOAD_URL + props.image;
        }
    };
    const mutate = () => {
        if(props.isLocal){
            FlowerStore.makeLocalMutation({id: props.id, image: props.image, genome: props.genome});
        }else{
            FlowerStore.makeRemoteMutation({id: props.id, image: props.image, genome: props.genome});
        }
    };

</script>

<style scoped>
    .FlowerImage{
        width: 100%;
        height: auto;
    }
    .FlowerCard{
        margin: auto auto auto auto;
    }
    .FlowerCard p{
        text-align: center;
    }
    .flowerMenu{
        background-color: green;
        box-shadow: 0.31rem 0.6rem 0.06rem 0.125rem rgba(12, 13, 12, 0.5);
        border: solid 0.06rem black;
        display: inline-flex;
        flex-flow: row nowrap;
        width: 100%;
        height: auto;
        justify-content: space-between;
    }
    .Selected{
        border-style: solid solid solid solid;
        border-color: red;
    }
    .FlowerCard{
        padding: 0.6rem;
        background-color: rgb(37, 39, 41);
    }
    .drop-menu{
        position: relative;
        display: inline-block;
    }
    .flower-buttons{
        position: absolute;
        z-index: 1;
        translate: 0 12%;
        padding: 0rem 1.31rem 1.31rem 0rem;
        background-color: green;
        box-shadow: 0.125rem 0.375rem 1rem 0.375rem rgba(0,128,0,0.5);
        display: flex;
        flex-flow: column wrap;
        border-radius: 0rem 0rem 1.25rem 1.25rem;
    }
    .flower-buttons a{
        font-size: 1.15rem;
        border-radius: 0.25rem;
        color: lightgreen;
        position: relative;
        margin: 0.6rem 0rem 0rem 1.18rem;
        background-color: green;
        cursor: pointer;
        text-decoration: none;
    }
    .pointer{
        cursor: pointer;
    }
    .flower-buttons a:hover{
        color: green;
        background-color: lightgreen;
    }
    .disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    p{
        color: lightgreen;
    }
</style>

<template>
  <div class="FlowerCard">
    <div v-if="props.isLocal">
      <div class="flowerMenu" :class="{ Selected: data.selected }">
        <div v-if="!data.openMainMenu" class="drop-menu pointer" @click="toggleMainMenu()">
          <svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" class="svg-icon svg-icon-fill" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 299.283">
            <path d="M75.334 286.691c-64.764 36.929-96.186-15.595-60.203-51.975L215.997 25.104c33.472-33.472 46.534-33.472 80.006 0l200.866 209.612c35.983 36.38 4.561 88.904-60.203 51.975L256 189.339 75.334 286.691z" />
          </svg>
        </div>
        <div v-if="data.openMainMenu" class="drop-menu pointer" @click="toggleMainMenu()">
          <svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" class="svg-icon svg-icon-fill" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 299.283">
            <path d="M75.334 12.591C10.57-24.337-20.852 28.186 15.131 64.566l200.866 209.613c33.472 33.471 46.534 33.471 80.006 0L496.869 64.566c35.983-36.38 4.561-88.903-60.203-51.975L256 109.944 75.334 12.591z" />
          </svg>
        </div>
        <div style="width: 100%; height: 100%; display: flex; justify-content: end">
          <img :key="props.id" class="pointer favourite-btn" alt="favourite button" :src="data.heartIconSrc" @click="toggleFavourite(props.id)">
          <button class="pointer safe-button" alt="more options" style="font-size: large; font-weight: bold" @click="toggleSecMenu()">+</button>
        </div>
        <Transition name="slide-from-top">
          <FloatingPanel v-if="data.openSecMenu" :loc="'bottom-end'" :match-parent-width="false" style="width: max-content; max-width: 90vw; right: 0">
            <div class="secondary-menu">
              <ParamsInfo :params="data.params" />
              <StatsInfo :stats="data.stats" />
              <button class="safe-button" @click="is3D = !is3D; emissive=false; toggleSecMenu();">3D</button>
              <button class="safe-button" @click="is3D = !is3D; emissive=true; toggleSecMenu();">E3D</button>
            </div>
          </FloatingPanel>
        </Transition>
        <Transition name="slide-from-top">
          <FloatingPanel v-if="data.openMainMenu" :loc="'bottom'" :match-parent-width="false">
            <div class="main-menu">
              <a @click="mutate(); toggleMainMenu();">Mutate</a>
              <a @click="onSelected(); toggleMainMenu();">Select Flower</a>
              <a @click="shareFlower(); toggleMainMenu();">Share</a>
              <a @click="describe(); toggleMainMenu();">Describe</a>
              <a @click="downloadGenome(); toggleMainMenu();">Download Genome</a>
              <a @click="downloadImage(); toggleMainMenu();">Download Image</a>
              <a @click="downloadPetals(); toggleMainMenu();">Download Petals</a>
              <a @click="download3DModel(); toggleMainMenu();">Download 3D</a>
              <a @click="downloadEmissive3DModel(); toggleMainMenu();">Download Emissive 3D</a>
              <a @click="showMutations(); toggleMainMenu();">Show Mutations</a>
              <a @click="showAncestors(); toggleMainMenu();">Show Descendants</a>
              <a @click="deleteThisFlower(); toggleMainMenu();">Delete Flower</a>
              <a @click="FlowerStore.redrawFlower({ genome: props.genome }); toggleMainMenu();">Redraw Flower</a>
            </div>
          </FloatingPanel>
        </Transition>
      </div>
      <div v-if="is3D" style="width: 100%; height: 100%">
        <ThreeFlower :id="props.id" :width="245" :height="350" :genome="props.genome" :emissive="emissive" />
      </div>
      <div v-else>
        <ZoomableImage :id="'FlImage' + props.id" :lens-size="data.lensSize" :magnification="FlowerStore.settings.magnification" loading="lazy" :src="getImage()" :alt="data.description" class="FlowerImage" />
      </div>
      <p>
        <strong>{{ props.id }}</strong>
      </p>
    </div>
    <div v-else>
      <div class="flowerMenu" :class="{ Selected: data.selected }">
        <div v-if="!data.openMainMenu" class="drop-menu pointer" @click="toggleMainMenu()">
          <svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" class="svg-icon svg-icon-fill" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" viewBox="0 0 512 299.283">
            <path d="M75.334 286.691c-64.764 36.929-96.186-15.595-60.203-51.975L215.997 25.104c33.472-33.472 46.534-33.472 80.006 0l200.866 209.612c35.983 36.38 4.561 88.904-60.203 51.975L256 189.339 75.334 286.691z" />
          </svg>
        </div>
        <div v-if="data.openMainMenu" class="drop-menu pointer" @click="toggleMainMenu()">
          <svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" class="svg-icon svg-icon-fill" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" viewBox="0 0 512 299.283"><path d="M75.334 12.591C10.57-24.337-20.852 28.186 15.131 64.566l200.866 209.613c33.472 33.471 46.534 33.471 80.006 0L496.869 64.566c35.983-36.38 4.561-88.903-60.203-51.975L256 109.944 75.334 12.591z" /></svg>
        </div>
        <div style="width: 100%; height: 100%; display: flex; justify-content: end; position: relative;">
          <img :key="props.id" class="pointer favourite-btn disabled" alt="favourite button" :src="data.heartIconSrc">
          <button class="pointer safe-button" alt="more options" style="font-size: large; font-weight: bold" @click="toggleSecMenu()">+</button>
          <Transition name="slide-from-top">
            <FloatingPanel v-if="data.openSecMenu" :loc="'bottom-end'" :match-parent-width="false" style="width: max-content">
              <div class="secondary-menu">
                <ParamsInfo :params="data.params" />
                <StatsInfo :stats="data.stats" />
                <button class="safe-button" @click="is3D = !is3D; emissive=false; toggleSecMenu();">3D</button>
                <button class="safe-button" @click="is3D = !is3D; emissive=true; toggleSecMenu();">E3D</button>
              </div>
            </FloatingPanel>
          </Transition>
        </div>
        <Transition name="slide-from-top">
          <FloatingPanel v-if="data.openMainMenu" :loc="'bottom'" :match-parent-width="false">
            <div class="main-menu">
              <a @click="mutate(); toggleMainMenu();">Mutate</a>
              <a @click="onSelected(); toggleMainMenu();">Select Flower</a>
              <a @click="addToLocal(); toggleMainMenu();">Add to local</a>
              <a @click="describe(); toggleMainMenu();">Describe</a>
              <a @click="downloadGenome(); toggleMainMenu();">Download Genome</a>
              <a @click="downloadImage(); toggleMainMenu();">Download Image</a>
              <a @click="downloadPetals(); toggleMainMenu();"> Download Petals </a>
              <a @click="download3DModel(); toggleMainMenu();"> Download 3D </a>
              <a @click="downloadEmissive3DModel(); toggleMainMenu();">Download Emissive 3D </a>
              <a @click="showMutations(); toggleMainMenu();">Show Mutations</a>
              <a @click="showAncestors(); toggleMainMenu();">Show Descendants</a>
            </div>
          </FloatingPanel>
        </Transition>
      </div>
      <div v-if="is3D" style="width: 100%; height: 100%">
        <ThreeFlower :id="props.id" :width="245" :height="350" :genome="props.genome" :emissive="emissive" />
      </div>
      <div v-else>
        <ZoomableImage :id="'FlImage' + props.id" :lens-size="data.lensSize" :magnification="FlowerStore.settings.magnification" loading="lazy" :src="getImage()" :alt="data.description" class="FlowerImage" />
      </div>
      <p>
        <strong>{{ props.id }}</strong>
      </p>
    </div>
  </div>
</template>

<script setup>
    import { onMounted, ref, reactive, inject, onUnmounted } from "vue";
    import { useFlowerStore } from '../stores/FlowerStore';
    import { useCaptionerStore } from '../stores/CaptionerStore';
    import { useErrorStore } from '../stores/ErrorStore';
    import { useRouter } from 'vue-router';
    import ParamsInfo from './ParamsInfo.vue';
    import StatsInfo from "./StatsInfo.vue";
    import ZoomableImage from './ZoomableImage.vue';
    import FloatingPanel from "./FloatingPanel.vue";
    import ThreeFlower from "./ThreeFlower.vue";
    import JSZip from "jszip";

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
    const is3D = ref(false);
    const emissive = ref(false);
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
        openMainMenu: false,
        openSecMenu: false,
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
        stats: {},
        lensSize: { x: 100, y: 100 },
    });
    const router = useRouter();
    const FlowerStore = useFlowerStore();
    const ErrorStore = useErrorStore();
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
            setTimeout(() => {
                data.stats = FlowerStore.fe.getFlowerStats(props.genome, 0.3, 23, 1000, 0);
            }, 100);
        }else{
            setTimeout(async () => {
                let blob = await fetch(data.DOWNLOAD_URL + props.genome);
                let genome = await blob.text();
                data.stats = FlowerStore.fe.getFlowerStats(genome, 0.3, 23, 1000, 0);
            }, 100);
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
    const toggleMainMenu = () => {
      data.openMainMenu = !data.openMainMenu;
    };
    const toggleSecMenu = () => {
      data.openSecMenu = !data.openSecMenu;
    };
    const deleteThisFlower = () => {
        emitter.emit('showYesNo', {
            title: 'Delete Action',
            message: 'Do you wanna delete flower ' + props.id + '?',
            btnNo: 'No',
            btnYes: 'Delete Flower',
            onConfirm: () => {
                FlowerStore.deleteLocalFlower(props.id);
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
        if(!CaptionerStore.hasModelLoaded){
            ErrorStore.push("check load model option or click download / load Model in Settings to use this.");
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
            ErrorStore.push("Add the flower to local first to add it to favourites.");
        }
    };
    const addToLocal = () => {
        if(!props.isLocal){
            FlowerStore.addRemoteFlowerToLocal({id: props.id, genome: props.genome, image: props.image});
        }else{
            ErrorStore.push("This flower is a local flower already.");
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
    const downloadPetalsImpl = async (genome) => {
            const zip = new JSZip();
            for(let i = FlowerStore.settings.params.numLayers; i >= 0; --i){
                let f = await FlowerStore.fe.drawPetalLayer(genome, i);
                zip.file(
                  `Flower_${props.id}_PetalLayer_${i}.png`,
                  f.image.split(",")[1],
                  { base64: true },
                );
            }
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `Flower_${props.id}_Petals.zip`;
            link.click();
    };
    const downloadPetals = async () => {
        if(props.isLocal){
            await downloadPetalsImpl(props.genome);
        }else{
            let blob = await fetch(data.DOWNLOAD_URL + props.genome);
            let genome = await blob.text();
            await downloadPetalsImpl(genome);
        }
    };
    const download3DModelImpl = async (genome, type) => {
        let model;
        if(type === "emissive"){
            model = model = await FlowerStore.fe.drawEmissive3DFlower(
                genome,
                props.id.toString(),
                "both"
          );
        }else{
          model = await FlowerStore.fe.draw3DFlower(
            genome,
            props.id.toString(),
            "both"
          );
        }
        const link = document.createElement("a");
        link.href = "data:application/json," + model;
        let name = type === "emissive" ? `Flower_${props.id}_Emissive.gltf` : `Flower_${props.id}.gltf`;
        link.download = name;
        link.click();
    };
    const downloadEmissive3DModel = async () => {
      if(props.isLocal){
          await download3DModelImpl(props.genome, "emissive");
      }else{
          let blob = await fetch(data.DOWNLOAD_URL + props.genome);
          let genome = await blob.text();
          await download3DModelImpl(genome, "emissive");
      }
    };
    const download3DModel = async () => {
      if(props.isLocal){
          await download3DModelImpl(props.genome, "normal");
      }else{
          let blob = await fetch(data.DOWNLOAD_URL + props.genome);
          let genome = await blob.text();
          await download3DModelImpl(genome, "normal");
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
<style>
    .FlowerImage{
        width: 100%;
        height: auto;
    }
</style>
<style scoped>
    .FlowerCard{
        margin: auto auto auto auto;
        padding: 0.6rem;
        background-color: rgb(37, 39, 41);
    }
    .FlowerCard p{
        text-align: center;
    }
    .flowerMenu{
        background-color: green;
        color: lightgreen;
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
    .drop-menu{
        position: relative;
        display: inline-block;
    }
    .secondary-menu{
        display: flex;
        gap: 5px;
        padding: 2px;
        padding-bottom: 10px;
        flex-flow: column nowrap;
        background-color: green;
        border-bottom-left-radius: 20px;
        border-bottom-right-radius: 20px;
        box-shadow: 0.125rem 0.375rem 1rem 0.375rem rgba(0, 128, 0, 0.5);
    }
    .main-menu{
        padding: 0rem 1.31rem 1.31rem 0rem;
        background-color: green;
        box-shadow: 0.125rem 0.375rem 1rem 0.375rem rgba(0, 128, 0, 0.5);
        display: flex;
        flex-flow: column wrap;
        border-radius: 0rem 0rem 1.25rem 1.25rem;
    }
    .main-menu a{
        font-size: 1.15rem;
        border-radius: 0.25rem;
        color: lightgreen;
        position: relative;
        margin: 0.6rem 0rem 0rem 1.18rem;
        background-color: green;
        cursor: pointer;
        text-decoration: none;
    }
    @media only screen and (max-width: 1280px){
        .main-menu a{
          font-size: 0.9rem;
        }
    }
    .pointer{
        cursor: pointer;
    }
    .main-menu a:hover{
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
    svg{
        filter: drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));
    }
    .svg-icon{
        display: inline-block;
        color: inherit;
        vertical-align: middle;
        fill: none;
        stroke: currentColor;
        margin-left: 2px;
    }
    .svg-icon-fill{
        display: inline-block;
        color: inherit;
        vertical-align: middle;
        fill: currentColor;
        stroke: currentColor;
    }
    .safe-button{
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        cursor: pointer;
        border-color: lightgreen;
        background-color: green;
        color: lightgreen;
    }
    .safe-button:hover{
        cursor: pointer;
        background-color: lightgreen;
        color: green;
    }
    .favourite-btn{
        filter: drop-shadow(2px 2px black);
    }
    .slide-from-top-enter-active,
    .slide-from-top-leave-active{
        transition: transform 0.3s ease, opacity 0.3s ease;
    }
    .slide-from-top-enter-from,
    .slide-from-top-leave-to{
        opacity: 0;
        transform: translateY(-15px);
    }
    .slide-from-top-enter-to,
    .slide-from-top-leave-from{
        opacity: 1;
        transform: translateY(0);
    }
</style>

<template>
  <div class="FlowerCard" data-testid="flower-card" :data-flower-id="props.id">
    <div v-if="props.isLocal">
      <div class="flowerMenu" :class="{ Selected: data.selected }">
        <ChevronButton data-testid="flower-menu-toggle" :open="data.openMainMenu" @click="toggleMainMenu()" />
        <div style="width: 100%; height: 100%; display: flex; justify-content: end">
          <FavouriteButton :key="props.id" data-testid="flower-favourite" :favourited="data.favourited" @toggle="toggleFavourite(props.id)" />
          <SafeButton size="symbol" data-testid="flower-more" aria-label="More options" @click="toggleSecMenu()">+</SafeButton>
        </div>
        <Transition name="slide-from-top">
          <FloatingPanel v-if="data.openSecMenu" :loc="'bottom-end'" :match-parent-width="false" style="width: max-content; max-width: 90vw; right: 0">
            <div class="secondary-menu">
              <ParamsInfo :params="data.params" />
              <StatsInfo :stats="data.stats" />
              <SafeButton size="compact" data-testid="flower-3d" @click="is3D = !is3D; emissive=false; toggleSecMenu();">3D</SafeButton>
              <SafeButton size="compact" data-testid="flower-e3d" @click="is3D = !is3D; emissive=true; toggleSecMenu();">E3D</SafeButton>
            </div>
          </FloatingPanel>
        </Transition>
        <Transition name="slide-from-top">
          <FloatingPanel v-if="data.openMainMenu" :loc="'bottom'" :match-parent-width="false">
            <div class="main-menu">
              <a data-testid="flower-mutate" @click="mutate(); toggleMainMenu();">Mutate</a>
              <a data-testid="flower-select" @click="onSelected(); toggleMainMenu();">Select Flower</a>
              <a @click="shareFlower(); toggleMainMenu();">Share</a>
              <a @click="describe(); toggleMainMenu();">Describe</a>
              <a @click="downloadGenome(); toggleMainMenu();">Download Genome</a>
              <a @click="downloadImage(); toggleMainMenu();">Download Image</a>
              <a @click="downloadPetals(); toggleMainMenu();">Download Petals</a>
              <a @click="download3DModel(); toggleMainMenu();">Download 3D</a>
              <a @click="downloadEmissive3DModel(); toggleMainMenu();">Download Emissive 3D</a>
              <a @click="showMutations(); toggleMainMenu();">Show Mutations</a>
              <a @click="showDescendants(); toggleMainMenu();">Show Descendants</a>
              <a @click="deleteThisFlower(); toggleMainMenu();">Delete Flower</a>
              <a @click="LocalFlowerStore.redrawFlower({ genome: props.genome }); toggleMainMenu();">Redraw Flower</a>
            </div>
          </FloatingPanel>
        </Transition>
      </div>
      <div v-if="is3D" style="width: 100%; height: 100%">
        <ThreeFlower :id="props.id" :width="245" :height="350" :genome="props.genome" :emissive="emissive" />
      </div>
      <div v-else>
        <ZoomableImage :id="'FlImage' + props.id" :lens-size="data.lensSize" :magnification="SettingsStore.settings.magnification" loading="lazy" :src="getImage()" :alt="description" class="FlowerImage" />
      </div>
      <p>
        <strong>{{ props.id }}</strong>
      </p>
      <SpeciesBadge :id="props.id" />
    </div>
    <div v-else>
      <div class="flowerMenu" :class="{ Selected: data.selected }">
        <ChevronButton data-testid="flower-menu-toggle" :open="data.openMainMenu" @click="toggleMainMenu()" />
        <div style="width: 100%; height: 100%; display: flex; justify-content: end; position: relative;">
          <FavouriteButton :key="props.id" :favourited="false" disabled />
          <SafeButton size="symbol" data-testid="flower-more" aria-label="More options" @click="toggleSecMenu()">+</SafeButton>
          <Transition name="slide-from-top">
            <FloatingPanel v-if="data.openSecMenu" :loc="'bottom-end'" :match-parent-width="false" style="width: max-content">
              <div class="secondary-menu">
                <ParamsInfo :params="data.params" />
                <StatsInfo :stats="data.stats" />
                <SafeButton size="compact" data-testid="flower-3d" @click="is3D = !is3D; emissive=false; toggleSecMenu();">3D</SafeButton>
                <SafeButton size="compact" data-testid="flower-e3d" @click="is3D = !is3D; emissive=true; toggleSecMenu();">E3D</SafeButton>
              </div>
            </FloatingPanel>
          </Transition>
        </div>
        <Transition name="slide-from-top">
          <FloatingPanel v-if="data.openMainMenu" :loc="'bottom'" :match-parent-width="false">
            <div class="main-menu">
              <a data-testid="flower-mutate" @click="mutate(); toggleMainMenu();">Mutate</a>
              <a data-testid="flower-select" @click="onSelected(); toggleMainMenu();">Select Flower</a>
              <a @click="addToLocal(); toggleMainMenu();">Add to local</a>
              <a @click="describe(); toggleMainMenu();">Describe</a>
              <a @click="downloadGenome(); toggleMainMenu();">Download Genome</a>
              <a @click="downloadImage(); toggleMainMenu();">Download Image</a>
              <a @click="downloadPetals(); toggleMainMenu();"> Download Petals </a>
              <a @click="download3DModel(); toggleMainMenu();"> Download 3D </a>
              <a @click="downloadEmissive3DModel(); toggleMainMenu();">Download Emissive 3D </a>
              <a @click="showMutations(); toggleMainMenu();">Show Mutations</a>
              <a @click="showDescendants(); toggleMainMenu();">Show Descendants</a>
            </div>
          </FloatingPanel>
        </Transition>
      </div>
      <div v-if="is3D" style="width: 100%; height: 100%">
        <ThreeFlower :id="props.id" :width="245" :height="350" :genome="props.genome" :emissive="emissive" />
      </div>
      <div v-else>
        <ZoomableImage :id="'FlImage' + props.id" :lens-size="data.lensSize" :magnification="SettingsStore.settings.magnification" loading="lazy" :src="getImage()" :alt="description" class="FlowerImage" />
      </div>
      <p>
        <strong>{{ props.id }}</strong>
      </p>
    </div>
  </div>
</template>

<script setup>
    import { onMounted, ref, reactive, inject, onUnmounted, computed } from "vue";
    import { useLocalFlowerStore } from '../stores/LocalFlowerStore';
    import { useRemoteFlowerStore } from '../stores/RemoteFlowerStore';
    import { useSettingsStore } from '../stores/SettingsStore';
    import { useFavouritesStore } from '../stores/FavouritesStore';
    import { getFlowerEvolver } from '../services/flowerEvolver';
    import { useCaptionerStore } from '../stores/CaptionerStore';
    import { useErrorStore } from '../stores/ErrorStore';
    import { useRouter } from 'vue-router';
    import ParamsInfo from './ParamsInfo.vue';
    import StatsInfo from "./StatsInfo.vue";
    import ZoomableImage from './ZoomableImage.vue';
    import FloatingPanel from "./FloatingPanel.vue";
    import ThreeFlower from "./ThreeFlower.vue";
    import SpeciesBadge from "./species/SpeciesBadge.vue";
    import FavouriteButton from "./ui/FavouriteButton.vue";
    import ChevronButton from "./ui/ChevronButton.vue";
    import SafeButton from "./ui/SafeButton.vue";
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
    const clamp = (val, min, max) => {
        return Math.min(max, Math.max(val, min));
    }
    const validateFloat = (number, Default) => {
        if(Number.isNaN(parseFloat(number))){
            return Default;
        }
        return number;
    };
    // The params of the petals are in the genome. The card of the browser has it as a prop, the card of the server
    // downloads it. A genome that cannot be read leaves the params as they were.
    const parseParams = (genome) => {
        if(!genome){
            return;
        }
        let petals;
        try{
            petals = JSON.parse(genome).Flower.petals;
        }catch{
            return;
        }
        if(!petals){
            return;
        }
        data.params = petals;
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
        // null until the database has said whether the flower is a favourite
        favourited: null,
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
    const LocalFlowerStore = useLocalFlowerStore();
    const RemoteFlowerStore = useRemoteFlowerStore();
    const SettingsStore = useSettingsStore();
    const FavouritesStore = useFavouritesStore();
    const ErrorStore = useErrorStore();
    const CaptionerStore = useCaptionerStore();
    // The description of a flower of the browser is the one the store has: the list that shows the card loads it,
    // and that can be after the card is shown.
    const description = computed(() => {
        const described = props.isLocal ? CaptionerStore.getLocalDescription(props.id) : undefined;
        return described === undefined ? data.description : "Flower " + props.id + " - " + described;
    });
    const emitter = inject('emitter');
    onMounted(() => {
        if(props.isLocal){
            parseParams(props.genome);
            FavouritesStore.isFavourited(props.id)
                .then((isFav) => {
                    data.favourited = isFav;
                });
            setTimeout(async () => {
                const fe = await getFlowerEvolver();
                data.stats = fe.getFlowerStats(props.genome, 0.3, 23, 1000, 0);
            }, 100);
        }else{
            setTimeout(async () => {
                // A server that does not answer is not an error to show: there is one of these per card, and the
                // card goes on with the default params and no stats.
                try{
                    const response = await fetch(data.DOWNLOAD_URL + props.genome);
                    if(!response.ok){
                        return;
                    }
                    const genome = await response.text();
                    parseParams(genome);
                    const fe = await getFlowerEvolver();
                    data.stats = fe.getFlowerStats(genome, 0.3, 23, 1000, 0);
                }catch{
                    // nothing to show, see above
                }
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
                LocalFlowerStore.deleteLocalFlower(props.id);
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
            LocalFlowerStore.selectLocalFlower({id: props.id, genome: props.genome,image: props.image});
        }else{
            RemoteFlowerStore.selectRemoteFlower({id: props.id, genome: props.genome,image: props.image});
        }
        emitter.emit('checkSelected');
    };
    const shareFlower = () => {
        RemoteFlowerStore.shareFlower(props.genome);
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
    const showDescendants = () => {
        let localOr = props.isLocal ? "local":"remote";
        router.push({name:'DescendantsFatherOrMother', params:{father: props.id, isLocal: localOr}});
    };
    const isSelected = () => {
        if(props.isLocal){
            return LocalFlowerStore.isLocalFlowerSelected({id: props.id, genome: props.genome, image: props.image})
        }
        return RemoteFlowerStore.isRemoteFlowerSelected({id: props.id, genome: props.genome, image: props.image})
    };
    // The heart answers at once and the database follows. Only the flowers of the browser have one: the button of
    // a flower of the server is disabled.
    const toggleFavourite = async (id) => {
        let isFav = await FavouritesStore.isFavourited(id);
        if(isFav){
            data.favourited = false;
            FavouritesStore.removeFlowerFromFav(id);
        }else{
            data.favourited = true;
            await FavouritesStore.addFlowerToFav(id);
        }
    };
    const addToLocal = () => {
        if(!props.isLocal){
            LocalFlowerStore.addRemoteFlowerToLocal({id: props.id, genome: props.genome, image: props.image});
        }else{
            ErrorStore.push("This flower is a local flower already.");
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
            const fe = await getFlowerEvolver();
            for(let i = SettingsStore.settings.params.numLayers; i >= 0; --i){
                let f = await fe.drawPetalLayer(genome, i);
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
        const fe = await getFlowerEvolver();
        if(type === "emissive"){
            model = await fe.drawEmissive3DFlower(
                genome,
                props.id.toString(),
                "both"
          );
        }else{
          model = await fe.draw3DFlower(
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
            LocalFlowerStore.makeLocalMutation({id: props.id, image: props.image, genome: props.genome});
        }else{
            RemoteFlowerStore.makeRemoteMutation({id: props.id, image: props.image, genome: props.genome});
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
        --fe-button-margin: 0;
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
    .secondary-menu{
        --fe-button-margin: 0;
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
    .main-menu a:hover{
        color: green;
        background-color: lightgreen;
    }
    p{
        color: lightgreen;
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

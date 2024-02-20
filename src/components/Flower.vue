<template>
  <div class="Flower">
    <div v-if="props.isLocal">
      <div class="outButtons" :class="{Selected: data.selected}">
        <img :key="props.id" class="pointer" alt="favourite button" :src="data.heartIconSrc" @click="toggleFavourite(props.id)">
        <img v-if="!data.clicked" class="drop-menu pointer" src="@/assets/x32/Arrow_down.png" @click="data.clicked = !data.clicked; ">
        <img v-if="data.clicked" class="drop-menu pointer" src="@/assets/x32/Arrow_up.png" @click="data.clicked = !data.clicked; ">
        <div v-if="data.clicked" class="flower-buttons">
          <ul>
            <li><a @click="mutate(); data.clicked = !data.clicked;">Mutate</a></li>
            <li><a @click="onSelected(); data.clicked = !data.clicked;">Select Flower</a></li>
            <li><a @click="downloadGenome(); data.clicked = !data.clicked;">Download Genome</a></li>
            <li><a @click="downloadImage(); data.clicked = !data.clicked;">Download Image</a></li>
            <li><a @click="showMutations(); data.clicked = !data.clicked;">Show Mutations</a></li>
            <li><a @click="showAncestors(); data.clicked = !data.clicked;">Show Descendants</a></li>
            <li><a @click="deleteThisFlower(); data.clicked = !data.clicked;">Delete Flower</a></li>
            <li><a @click="store.redrawFlower({genome: props.genome}); data.clicked = !data.clicked;">Redraw Flower</a></li>
          </ul>
        </div>
      </div>
      <img :id="'FlImage' + props.id" loading="lazy" :src="getImage()" :alt="'flower ' + props.id" class="FlowerImage">
      <p><strong>{{ props.id }}</strong></p>
    </div>
    <div v-else>
      <div class="outButtons" :class="{Selected: data.selected}">
        <img :key="props.id" class="pointer disabled" alt="disabled favourite button" :src="data.heartIconSrc">
        <img v-if="!data.clicked" class="drop-menu pointer" src="@/assets/x32/Arrow_down.png" @click="data.clicked = !data.clicked; ">
        <img v-if="data.clicked" class="drop-menu pointer" src="@/assets/x32/Arrow_up.png" @click="data.clicked = !data.clicked; ">
        <div v-if="data.clicked" class="flower-buttons">
          <ul>
            <li><a @click="mutate(); data.clicked = !data.clicked;">Mutate</a></li>
            <li><a @click="onSelected(); data.clicked = !data.clicked;">Select Flower</a></li>
            <li><a @click="addToLocal(); data.clicked = !data.clicked;">Add to local</a></li>
            <li><a @click="downloadGenome(); data.clicked = !data.clicked;">Download Genome</a></li>
            <li><a @click="downloadImage(); data.clicked = !data.clicked;">Download Image</a></li>
            <li><a @click="showMutations(); data.clicked = !data.clicked;">Show Mutations</a></li>
            <li><a @click="showAncestors(); data.clicked = !data.clicked;">Show Descendants</a></li>
          </ul>
        </div>
      </div>
      <img :id="'FlImage' + props.id" loading="lazy" :src="getImage()" :alt="'flower ' + props.id" class="FlowerImage">
      <p><strong>{{ props.id }}</strong></p>
    </div>
  </div>
</template>

<script setup>

    import { useFlowersStore } from '../store';
    import { onMounted, reactive, inject, onUnmounted } from 'vue';
    import { useRouter } from 'vue-router';
	
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
    const data = reactive({
        IMAGES_URL: import.meta.env.VITE_APP_IMAGES_URL,
        DOWNLOAD_URL: import.meta.env.VITE_APP_DOWNLOAD_URL,
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
    });
    const router = useRouter();
    const store = useFlowersStore();
    const emitter = inject('emitter');
    onMounted(() => {
        data.selected = isSelected();
        emitter.on('checkSelected', () => {
            data.selected = isSelected();
        });
        store.isFavourited(props.id)
            .then((isFav) => {
                if(isFav){
                    data.heartIconSrc = loadImage("heart_full.png","x32");
                }
            });
    });
    onUnmounted(() => {
        emitter.off('checkSelected');
    });

    const deleteThisFlower = () => {
        emitter.emit('showYesNo', {
            title: 'Delete Action',
            message: 'Do you wanna delete flower ' + props.id + '?',
            btnNo: 'No',
            btnYes: 'Delete Flower',
            onConfirm: (dialog) => {
                store.deleteLocalFlower(props.id);
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
            store.selectLocalFlower({id: props.id, genome: props.genome,image: props.image});
        }else{
            store.selectRemoteFlower({id: props.id, genome: props.genome,image: props.image});
        }
        emitter.emit('checkSelected');
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
            return store.isLocalFlowerSelected({id: props.id, genome: props.genome, image: props.image})
        }
        return store.isRemoteFlowerSelected({id: props.id, genome: props.genome, image: props.image})
    };
    const toggleFavourite = async (id) => {
        if(props.isLocal){
            let isFav = await store.isFavourited(id);
            if(isFav){
                data.index = 6;
                setTimeout(changeHeartIcon, 50, true);
                store.removeFlowerFromFav(id);
            }else{
                data.index = 0;
                setTimeout(changeHeartIcon, 50, false);
                await store.addFlowerToFav(id);
            }
        }else{
            store.errors.push({message: "Add the flower to local first to add it to favourites."});
        }
    };
    const addToLocal = () => {
        if(!props.isLocal){
            store.addRemoteFlowerToLocal({id: props.id, genome: props.genome, image: props.image});
        }else{
            store.errors.push({message: "This flower is a local flower already."});
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
            store.makeLocalMutation({id: props.id, image: props.image, genome: props.genome});
        }else{
            store.makeRemoteMutation({id: props.id, image: props.image, genome: props.genome});
        }
    };

</script>

<style scoped>
    .FlowerImage{
        width: 100%;
        height: auto;
    }
    .Flower{
        margin: auto auto auto auto;
    }
    .Flower p{
        text-align: center;
    }
    .outButtons{
        background-color: green;
        box-shadow: 0.31rem 0.6rem 0.06rem 0.125rem rgba(12, 13, 12, 0.5);
        border: solid 0.06rem black;
    }
    .Selected{
        border-style: solid solid solid solid;
        border-color: red;
    }
    .Flower{
        padding: 0.6rem;
        background-color: rgb(37, 39, 41);
    }
    .drop-menu{
        position: relative;
        display: inline-block;
    }
    .flower-buttons{
        position: absolute;
        padding: 0rem 1.31rem 0rem 0rem;
        float: right;
        background-color: green;
        border-top: 0.125rem lightgreen;
        box-shadow: 0.125rem 0.375rem 1rem 0.375rem rgba(0,128,0,0.5);
        z-index: 1;
    }
    .flower-buttons ul{
        margin: 0.6rem 1.25rem 0.6rem 1.18rem;
        text-align: left;
        padding: 0rem;
        padding-right: 0.25rem;
        list-style: none;
    }
    .flower-buttons li{
        font-size: 1.25rem;
        border-radius: 0.25rem;
        position: relative;
        margin: 0.6rem 0rem 0rem 1.18rem;
        list-style: none;
        background-color: green;
        cursor: pointer;
        text-decoration: none;
    }
    .pointer{
        cursor: pointer;        
    }
    .flower-buttons a{
        color: lightgreen;
    }
    .flower-buttons a:hover{
        color: green;
    }
    .flower-buttons li:hover{
        background-color: lightgreen;
        color: green;
    }
    .disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    p{
        color: lightgreen;
    }
</style>

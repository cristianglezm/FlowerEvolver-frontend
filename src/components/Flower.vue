<template>
    <div class="Flower">
        <div v-if="isLocal">
            <div class="outButtons" :class="{Selected: selected}">
                <img class="pointer" @click="toggleFavourite(id)" :src="heartIconSrc" :key="id"/>
                <img class="drop-menu pointer" v-if="!clicked" @click="clicked = !clicked; " src="@/assets/x32/Arrow_down.png"/>
                <img class="drop-menu pointer" v-if="clicked" @click="clicked = !clicked; " src="@/assets/x32/Arrow_up.png"/>
                <div class="buttons" v-if="clicked">
                    <ul>
                        <li><a @click="mutate(); clicked = !clicked;">Mutate</a></li>
                        <li><a @click="onSelected(); clicked = !clicked;">Select Flower</a></li>
                        <li><a @click="downloadGenome(); clicked = !clicked;">Download Genome</a></li>
                        <li><a @click="downloadImage(); clicked = !clicked;">Download Image</a></li>
                        <li><a @click="showMutations(); clicked = !clicked;">Show Mutations</a></li>
                        <li><a @click="showAncestors(); clicked = !clicked;">Show Descendants</a></li>
                        <li><a @click="deleteThisFlower(); clicked = !clicked;">Delete Flower</a></li>
                        <li><a @click="redrawFlower({genome: this.genome}); clicked = !clicked;">Redraw Flower</a></li>
                    </ul>
                </div>
            </div>
            <img :id="'FlImage' + id" :src="getImage()" :alt="id" class="FlowerImage"/>
            <p><strong>{{ id }}</strong></p>
        </div>
        <div v-else>
            <div class="outButtons" :class="{Selected: selected}">
                <img class="pointer disabled"  :src="heartIconSrc" :key="id"/>
                <img class="drop-menu pointer" v-if="!clicked" @click="clicked = !clicked; " src="@/assets/x32/Arrow_down.png"/>
                <img class="drop-menu pointer" v-if="clicked" @click="clicked = !clicked; " src="@/assets/x32/Arrow_up.png"/>
                <div class="buttons" v-if="clicked">
                    <ul>
                        <li><a @click="mutate(); clicked = !clicked;">Mutate</a></li>
                        <li><a @click="onSelected(); clicked = !clicked;">Select Flower</a></li>
						<li><a @click="addToLocal(); clicked = !clicked;">Add to local</a></li>
                        <li><a @click="downloadGenome(); clicked = !clicked;">Download Genome</a></li>
                        <li><a @click="downloadImage(); clicked = !clicked;">Download Image</a></li>
                        <li><a @click="showMutations(); clicked = !clicked;">Show Mutations</a></li>
                        <li><a @click="showAncestors(); clicked = !clicked;">Show Descendants</a></li>
                    </ul>
                </div>
            </div>
            <img :id="'FlImage' + id" :src="getImage()" :alt="id" class="FlowerImage"/>
            <p><strong>{{ id }}</strong></p>
        </div>
    </div>
</template>

<script>
    import { mapActions } from 'pinia';
    import { useFlowersStore } from '../store';
    import { defineComponent } from 'vue';
	
    export default defineComponent({
        name:'Flower',
        props:{
            id: Number,
            genome: String,
            image: String,
            isLocal: Boolean,
        },
        mounted(){
            this.$emitter.on('checkSelected', (e) => {
                this.selected = this.isSelected();
            });
            this.isFavourited(this.id)
                .then((isFav) => {
                    if(isFav){
                        this.heartIconSrc = this.loadImage("heart_full.png","x32");
                    }
                });
        },
        data(){
            return{
                IMAGES_URL: import.meta.env.VITE_APP_IMAGES_URL,
                DOWNLOAD_URL: import.meta.env.VITE_APP_DOWNLOAD_URL,
                clicked: false,
                selected: this.isSelected(),
                index: 0,
                heartIconSrc: this.loadImage("heart_empty.png","x32"),
                heartAnimation: [
                                this.loadImage("heart_empty.png","x32"),
                                this.loadImage("heart_filling0.png","x32"),
                                this.loadImage("heart_filling1.png","x32"),
                                this.loadImage("heart_filling2.png","x32"),
                                this.loadImage("heart_filling3.png","x32"),
                                this.loadImage("heart_filling4.png","x32"),
                                this.loadImage("heart_full.png","x32"),
                                ],
            }
        },
        methods:{
            ...mapActions(useFlowersStore,[
                'addFlowerToFav',
                'addRemoteFlowerToLocal',
                'removeFlowerFromFav',
                'selectLocalFlower',
                'selectRemoteFlower',
                'makeRemoteMutation',
                'makeLocalMutation',
                'isFavourited',
                'deleteLocalFlower',
                'redrawFlower'
            ]),
            deleteThisFlower: function(){
                this.$emitter.emit('showYesNo', {
                    title: 'Delete Action',
                    message: 'Do you wanna delete flower ' + this.id + '?',
                    btnNo: 'No',
                    btnYes: 'Delete Flower',
                    onConfirm: (dialog) => {
                        this.deleteLocalFlower(this.id);
                        dialog.close();
                    },
                });
            },
            loadImage: function(url, res){
                return new URL(`/src/assets/${res}/${url}`, import.meta.url);
            },
            getImage: function(){
                if(this.isLocal){
                    return this.image;
                }else{
					return this.IMAGES_URL + this.image;
                }
            },
            onSelected: function(){
                if(this.isLocal){
                    this.selectLocalFlower({id:this.id, genome:this.genome,image:this.image});
                }else{
                    this.selectRemoteFlower({id:this.id, genome:this.genome,image:this.image});
                }
                this.$emitter.emit('checkSelected');
            },
            showMutations: function(){
                let localOr = this.isLocal ? "local":"remote";
                this.$router.push({name:'Mutations', params:{id:this.id, isLocal: localOr}});
            },
            showAncestors: function(){
                let localOr = this.isLocal ? "local":"remote";
                this.$router.push({name:'DescendantsFatherOrMother', params:{father:this.id, isLocal: localOr}});
            },
            isSelected: function(){
                if(this.isLocal){
                    return this.$store.isLocalFlowerSelected({id:this.id, genome:this.genome,image:this.image})
                }
                return this.$store.isRemoteFlowerSelected({id:this.id, genome:this.genome,image:this.image})
            },
            toggleFavourite: async function(id){
                if(this.isLocal){
                    let isFav = await this.isFavourited(id);
                    if(isFav){
                        this.index = 6;
                        setTimeout(this.changeHeartIcon, 50, true);
                        await this.removeFlowerFromFav(id);
                    }else{
                        this.index = 0;
                        setTimeout(this.changeHeartIcon, 50, false);
                        await this.addFlowerToFav(id);
                    }
                }else{
                    this.$store.errors.push({message: "Add the flower to local first to add it to favourites."});
                }
            },
            addToLocal: function(){
                if(!this.isLocal){
                    this.addRemoteFlowerToLocal({id: this.id, genome: this.genome, image: this.image});
                }else{
                    this.$store.errors.push({message: "This flower is a local flower already."});
                }
            },
            changeHeartIcon: function(desc){
                this.heartIconSrc = this.heartAnimation[this.index];
                if(this.index < 6 && !desc){
                    this.index += 1;
                    setTimeout(this.changeHeartIcon, 50, desc);
                }else if(this.index > 0 && desc){
                    this.index -= 1;
                    setTimeout(this.changeHeartIcon, 50, desc);
                }
            },
            downloadGenome: function(){
                if(this.isLocal){
                    const a = document.createElement("a");
                    a.href = 'data:text/json;charset=utf-8,' + this.genome;
                    a.download = "flower " + this.id + ".json";
                    a.click();
                }else{
                    window.location = this.DOWNLOAD_URL + this.genome;
                }
            },
            downloadImage: function(){
                if(this.isLocal){
                    const a = document.createElement("a");
                    a.href = this.image;
                    a.download = "flower " + this.id + ".png";
                    a.click();
                }else{
                    window.location = this.DOWNLOAD_URL + this.image;
                }
            },
            mutate: function(){
                if(this.isLocal){
                    this.makeLocalMutation({id:this.id, image:this.image, genome:this.genome});
                }else{
                    this.makeRemoteMutation({id:this.id, image:this.image, genome:this.genome});
                }
            },
        }
    });
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
    .buttons{
        position: absolute;
        padding: 0rem 1.31rem 0rem 0rem;
        float: right;
        background-color: green;
        border-top: 0.125rem lightgreen;
        box-shadow: 0.125rem 0.375rem 1rem 0.375rem rgba(0,128,0,0.5);
        z-index: 1;
    }
    .buttons ul{
        margin: 0.6rem 1.25rem 0.6rem 1.18rem;
        text-align: left;
        padding: 0rem;
        padding-right: 0.25rem;
        list-style: none;
    }
    .buttons li{
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
    .buttons a{
        color: lightgreen;
    }
    .buttons a:hover{
        color: green;
    }
    .buttons li:hover{
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

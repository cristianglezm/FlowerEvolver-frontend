<template>
    <div class="Flower">
        <div v-if="this.$route.path === '/Demo'">
            <div class="outButtons">
                <img class="disabled" :src="heartIconSrc" :key="id"/>
                <img class="drop-menu disabled" v-if="!clicked" src="@/assets/x32/Arrow_down.png"/>
                <img class="drop-menu disabled" v-if="clicked" src="@/assets/x32/Arrow_up.png"/>
                <div class="buttons" v-if="clicked">
                    <ul>
                        <li><a class="disabled">Mutate</a></li>
                        <li><a class="disabled">Select Flower</a></li>
                        <li><a class="disabled">Download Genome</a></li>
                        <li><a class="disabled">Download Image</a></li>
                        <li><a class="disabled">Show Mutations</a></li>
                        <li><a class="disabled">Show Descendants</a></li>
                    </ul>
                </div>
            </div>
            <img :id="'FlImage' + id" :src="checkUrl()" :alt="id" class="FlowerImage"/>
            <p><strong>id: {{id}}</strong></p>
        </div>
        <div v-else>
            <div class="outButtons" :class="{Selected: selected}">
                <img class="pointer" @click="toogleFavourite({id:id, genome:genome,image:image})" :src="heartIconSrc" :key="id"/>
                <img class="drop-menu pointer" v-if="!clicked" @click="clicked = !clicked; " src="@/assets/x32/Arrow_down.png"/>
                <img class="drop-menu pointer" v-if="clicked" @click="clicked = !clicked; " src="@/assets/x32/Arrow_up.png"/>
                <div class="buttons" v-if="clicked">
                    <ul>
                        <li><a @click="mutate(); clicked = !clicked;">Mutate</a></li>
                        <li><a @click="onSelected(); clicked = !clicked;">Select Flower</a></li>
                        <li><a @click="getGenome(); clicked = !clicked;">Download Genome</a></li>
                        <li><a @click="downloadImage(); clicked = !clicked;">Download Image</a></li>
                        <li><a @click="showMutations(); clicked = !clicked;">Show Mutations</a></li>
                        <li><a @click="showAncestors(); clicked = !clicked;">Show Descendants</a></li>
                    </ul>
                </div>
            </div>
            <img :id="'FlImage' + id" :src="checkUrl()" :alt="id" class="FlowerImage"/>
            <p><strong>id: {{id}}</strong></p>
        </div>
    </div>
</template>

<script>
    import { mapActions } from 'vuex';

    export default {
        name:'Flower',
        props:{
            id: Number,
            genome: String,
            image: String,
            useUrl: Boolean,
        },
        mounted(){
            this.$root.$on('checkSelected', function(){
                var sel = this.isSelected();
                this.$set(this.$data, 'selected', sel);
            }.bind(this));
        },
        data(){
            return{
                IMAGES_URL: process.env.VUE_APP_IMAGES_URL,
                DOWNLOAD_URL: process.env.VUE_APP_DOWNLOAD_URL,
                clicked: false,
                selected: this.isSelected(),
                index: 0,
                heartIconSrc: this.isFavourited({id:this.id, genome:this.genome,image:this.image}) ? require('@/assets/x32/heart_full.png'):require('@/assets/x32/heart_empty.png'),
                heartAnimation: [
                            require('@/assets/x32/heart_empty.png'),
                            require('@/assets/x32/heart_filling0.png'),
                            require('@/assets/x32/heart_filling1.png'),
                            require('@/assets/x32/heart_filling2.png'),
                            require('@/assets/x32/heart_filling3.png'),
                            require('@/assets/x32/heart_filling4.png'),
                            require('@/assets/x32/heart_full.png'),
                            ],
            }
        },
        methods:{
            ...mapActions([
              'addFlowerToFav',
              'removeFlowerFromFav',
              'selectFlower',
              'makeMutation',
            ]),
            checkUrl: function(){
                if(this.useUrl){
                    return this.IMAGES_URL + this.image;
                }else{
                    return this.image;
                }
            },
            onSelected: function(){
                if(this.$route.path === '/Demo'){
                    this.$store.state.errors.push({message:'You can\'t do this while on Demo'});
                }else{
                    this.selectFlower({id:this.id, genome:this.genome,image:this.image});
                    this.$root.$emit('checkSelected');
                }
            },
            showMutations: function(){
                this.$router.push({name:'Mutations', params:{id:this.id}});
            },
            showAncestors: function(){
                this.$router.push({name:'DescendantsFatherOrMother', params:{father:this.id}});
            },
            isSelected: function(){
                return this.$store.getters.isFlowerSelected({id:this.id, genome:this.genome,image:this.image})
            },
            isFavourited: function(flower){
                return this.$store.state.favourites.some(fav => JSON.stringify(flower) === JSON.stringify(fav));
            },
            toogleFavourite: function(flower){
                if(this.$route.path === '/Demo'){
                    this.$store.state.errors.push({message:'You can\'t do this while on Demo'});
                }else{
                    if(this.isFavourited(flower)){
                        this.index = 6;
                        setTimeout(this.changeHeartIcon, 50, true);
                        this.removeFlowerFromFav(flower);
                    }else{
                        this.index = 0;
                        setTimeout(this.changeHeartIcon, 50, false);
                        this.addFlowerToFav(flower);
                    }
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
            getGenome: function(){
                if(this.$route.path === '/Demo'){
                    this.$store.state.errors.push({message:this.genome});
                }else{
                    window.location = this.DOWNLOAD_URL + this.genome;
                }
            },
            mutate: function(){
                if(this.$route.path === '/Demo'){
                    this.$store.state.errors.push({message:'You can\'t do this while on Demo'});
                }else{
                    this.makeMutation({id:this.id, image:this.image, genome:this.genome});
                }
            },
            downloadImage: function(){
                if(this.$route.path === '/Demo'){
                    window.location.href = this.image;
                }else{
                    window.location = this.DOWNLOAD_URL + this.image;
                }
            },
        }
    }
</script>

<style scoped>
    .FlowerImage{
        width:100%;
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
        box-shadow: 5px 10px 1px 2px rgba(12, 13, 12, 0.5);
        border: solid 1px black;
    }
    .Selected{
        border-style: solid solid solid solid;
        border-color: red;
    }
    .Flower{
        padding: 10px 10px 10px 10px;
        background-color: rgb(37, 39, 41);
    }
    .drop-menu{
        position: relative;
        display: inline-block;
    }
    .buttons{
        position: absolute;
        padding: 0px 21px 0px 0px;
        float: right;
        background-color: green;
        border-top: 2px lightgreen;
        box-shadow: 2px 6px 16px 6px rgba(0,128,0,0.5);
        z-index: 1;
    }
    .buttons ul{
        margin: 10px 20px 10px 19px;
        text-align: left;
        padding: 0;
        padding-right: 4px;
        list-style: none;
    }
    .buttons li{
        font-size: 20px;
        border-radius: 4px;
        position: relative;
        margin: 10px 0px 0px 19px;
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
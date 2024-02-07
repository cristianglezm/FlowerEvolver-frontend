<template>
    <div class="Header">
        <div v-if="showWarning" role="warning" id="warning"><span @click="showWarning = false">X</span><p>Remote flowers are deleted daily at 00:00 UTC</p></div>
        <header id="appTitle">
            <a :href="this.base_url" style="text-decoration: none; position: relative; z-index: 1;"><h1>Flower Evolver</h1></a>
            <canvas id="flowerGarden" :width="flowerGardenRect.width" :height="flowerGardenRect.height"></canvas>
        </header>
        <div v-if="isMobile()" style="margin: 10px 0px 0px 0px;">
            <img @click="showMenu=!showMenu" src="@/assets/x32/menu.png" alt="menuIcon" class="pointer"/>
            <div v-if="showMenu" class="mobileMenu">
                <nav class="tabs" v-if="isPaginated()" @click="showMenu=!showMenu" alt="tabs">
                        <router-link to="/Local?page=0"> Local </router-link>
                        <router-link to="/LastAdded"> Last Added </router-link>
                        <router-link to="/Browse?page=0"> Browse </router-link>
                        <router-link to="/Favourites?page=0"> Favourites </router-link>
                        <router-link to="/Downloads"> Downloads </router-link>
                        <router-link to="/Settings"> Settings </router-link>
                </nav>
                <nav class="tabs" v-else @click="showMenu=!showMenu" alt="tabs">
                        <router-link to="/Local"> Local </router-link>
                        <router-link to="/LastAdded"> Last Added </router-link>
                        <router-link to="/Browse"> Browse </router-link>
                        <router-link to="/Favourites"> Favourites </router-link>
                        <router-link to="/Downloads"> Downloads </router-link>
                        <router-link to="/Settings"> Settings </router-link>
                </nav>
                <nav class="actions" alt="actions">
                    <div v-if="this.isLocal || blocked" style="display: flex; flex-flow: column wrap;z-index: 1;left: 0px;position: absolute;">
                        <button @click="makeLocalFlower(); showMenu=!showMenu"> New Local Flower</button>
                        <button @click="localReproduce(); showMenu=!showMenu"> Local Reproduce Selected</button>
                        <button @click="showAncestors(); showMenu=!showMenu"> Show Local Selected Descendants</button>
                    </div>
                    <div v-else style="display: flex; flex-flow: column wrap;z-index: 1;left: 0px;position: absolute;">
                        <button @click="block(makeRemoteFlower); showMenu=!showMenu"> New Remote Flower</button>
                        <button @click="block(remoteReproduce); showMenu=!showMenu"> Remote Reproduce Selected</button>
                        <button @click="block(showAncestors); showMenu=!showMenu"> Show Remote Selected Descendants</button>
                    </div>
                </nav>
            </div>
        </div>
        <div v-else>
            <nav class="tabs" alt="tabs">
                <ul v-if="isPaginated()">
                    <router-link to="/Local?page=0"> Local </router-link>
                    <router-link to="/LastAdded"> Last Added </router-link>
                    <router-link to="/Browse?page=0"> Browse </router-link>
                    <router-link to="/Favourites?page=0"> Favourites </router-link>
                    <router-link to="/Downloads"> Downloads </router-link>
                    <router-link to="/Settings"> Settings </router-link>
                </ul>
                <ul v-else>
                    <router-link to="/Local"> Local </router-link>
                    <router-link to="/LastAdded"> Last Added </router-link>
                    <router-link to="/Browse"> Browse </router-link>
                    <router-link to="/Favourites"> Favourites </router-link>
                    <router-link to="/Downloads"> Downloads </router-link>
                    <router-link to="/Settings"> Settings </router-link>
                </ul>
            </nav>
            <div class="actions" alt="actions">
                <ul v-if="this.isLocal">
                    <button @click="makeLocalFlower()"> New Local Flower</button>
                    <button @click="localReproduce()"> Local Reproduce Selected</button>
                    <button @click="showAncestors()"> Show Local Selected Descendants</button>
                </ul>
                <ul v-else-if="blocked">
                    <button class="disabled"> New Remote Flower</button>
                    <button class="disabled"> Remote Reproduce Selected</button>
                    <button class="disabled"> Show Remote Selected Descendants</button>                
                </ul>
                <ul v-else>
                    <button @click="block(makeRemoteFlower)"> New Remote Flower</button>
                    <button @click="block(remoteReproduce)"> Remote Reproduce Selected</button>
                    <button @click="block(showAncestors)"> Show Remote Selected Descendants</button>
                </ul>
            </div>
        </div>
        <ErrorModal :errors="this.$store.errors" />
        <ConfirmModal :channel="this.$emitter" :id="'globalConfirm'" :on="'showYesNo'" />
    </div>
</template>
<script>
    import { mapActions, mapState} from 'pinia';
	import { useFlowersStore } from '../store';
    import ErrorModal from './ErrorModal.vue';
    import ConfirmModal from './ConfirmModal.vue';
	import { defineComponent } from 'vue';

    export default defineComponent({
        name:'Header',
        components:{
            ErrorModal,
            ConfirmModal
        },
        props:{
            isLocal: Boolean,
        },
        mounted: function(){
            this.flowerGardenRect = this.getRect();
            setTimeout(() => {
                let numFlowers = this.flowerGardenRect.width / 32;
                for(let i=0;i<numFlowers;++i){
                    this.animateTitle(i);
                }
            }, 200);
        },
        data(){
            return {
                blocked: false,
                showWarning: true,
                showMenu: false,
                base_url: import.meta.env.BASE_URL,
                flowerGardenRect: {width:200, height:200},
            }
        },
        methods:{
            ...mapState(useFlowersStore, {
                getRemoteSelected: 'getRemoteSelected',
                getLocalSelected: 'getLocalSelected'
            }),
            ...mapActions(useFlowersStore, [
				'makeRemoteFlower',
				'makeLocalFlower',
				'remoteReproduce',
				'localReproduce'
            ]),
            block: function(Fn){
                if(!this.blocked){
                    this.blocked = true;
                    Fn();
                    setTimeout(function(){
                        this.blocked = false;
                    }.bind(this), 2000);
                }
            },
            showAncestors: function(){
                if(this.isLocal){
                    let selected = this.getLocalSelected();
                    if(selected.length < 1){
                        this.$store.errors.push({message:'You need to select two flowers'});
                    }else{
                        this.$router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1], isLocal: "local"}});
                    }
                }else{
                    let selected = this.getRemoteSelected();
                    if(selected.length < 1){
                        this.$store.errors.push({message:'You need to select two flowers'});
                    }else{
                        this.$router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1], isLocal: "remote"}});
                    }
                }
            },
            getRect: function(){
                const element = document.getElementById('appTitle');
                return element.getBoundingClientRect();
            },
            animateTitle: function(i){
                let flowerGarden = document.getElementById("flowerGarden");
                let ctx = flowerGarden.getContext("2d");
                let radius = 8;
                let x = i * (radius * 4);
                let y = flowerGarden.height - (radius*3 + 2);
                try{
                    let canvas = document.getElementById("canvas");
                    canvas.width = radius*2;
                    canvas.height = radius*3;
                    this.$store.fe.makeFlower(radius, 2, 6.0, 1.0);
                }catch(e){
                    this.$store.errors.push({message: e});
                }
                ctx.drawImage(canvas, x, y);
            },
            isPaginated: function(){
                return this.$store.settings.pagination;
            },
            isMobile: function(){
                return screen.width <= 1280;
            },
        },
    });
</script>

<style scoped>
    h1{
        font-size: 7.5rem;
        padding: 0rem;
        margin: 0rem;
        color: lightgreen;
    }
    @media only screen and (max-width: 1280px){
        h1{
            font-size: 2.25rem;
            padding: 0rem;
            margin: 0rem;
            color: lightgreen;
        }
    }
    #flowerGarden{
        position: absolute;
        top: 0.6rem;
        z-index: 0;
    }
    .Header{
        background-color: green;
        position: relative;
    }
    .tabs ul{
        margin: 0rem;
        padding: 0rem;
    }
    .tabs a:hover{
        background-color: rgb(37, 39, 41);
    }
    .tabs a{
        text-decoration: none;
        float: left;
        text-indent: 0.6rem;
        padding: 0.125rem 0.6rem 0rem 0rem;
        margin: 0.6rem 0rem 0rem 0rem;
        color: lightgreen;
        border-radius: 0.75rem 0.75rem 0rem 0rem;
    }
    .router-link-active{
        background-color: rgb(37, 39, 41);
    }
    .tabs{
        position: relative;
        top: 3.4rem;
        font-size: xx-large;
    }
    @media only screen and (max-width: 1280px){
        #appTitle{
            padding: 0rem 0rem 0.6rem 0rem;
        }
        .mobileMenu{
            box-shadow: 0.31rem 0.6rem 0.06rem 0.125rem rgba(12, 13, 12, 0.5);
            width: 100%;
            height: 330%;
            background-color: rgb(0, 128, 0, 0.8);
            display: flex;
            flex-flow: row wrap;
            position: absolute;
            z-index:1;
        }
        .tabs a{
            text-decoration: none;
            float: left;
            text-indent: 0.6rem;
            padding: 0.125rem 0.6rem 0rem 0rem;
            margin: 0.6rem 0rem 0rem 0rem;
            color: lightgreen;
            border-radius: 0.75rem;
        }
        .tabs{
            display: flex;
            flex-flow: column wrap;
            top: 1.25rem;
            position: absolute;
            font-size: large;
            z-index: 1;
        }
    }
    .actions{
        text-align: right;
        padding-bottom: 0.56rem;
    }
    .actions button{
        position: relative;
        font-size: 1.25rem;
        border-radius: 19.68rem 20.93rem 9.68rem 8.43rem;
        margin: 0.6rem 0.6rem 0rem 0.125rem;
        cursor: pointer;
        border-color: lightgreen;
        background-color: green;
        color: lightgreen;
    }
    .actions button:hover{
        border-color: green;
        background-color: lightgreen;
        color: green;
    }
    @media only screen and (max-width: 1280px){
        .actions{
            text-align: right;
            padding-bottom: 0.56rem;
            position: absolute;
            display: flex;
            flex-flow: column wrap;
            z-index: 1;
            right: 7.5rem;
        }
        .actions button{
            font-size: 0.93rem;
            border-radius: 19.68rem 20.93rem 9.68rem 8.43rem;
            margin: 0.6rem 0.6rem 0rem 0.125rem;
            cursor: pointer;
            border-color: lightgreen;
            background-color: green;
            color: lightgreen;
        }
        .actions button:hover{
            border-color: green;
            background-color: lightgreen;
            color: green;
        }
    }
    .disabled{
      opacity: 0.5;
      cursor: not-allowed !important;
    }
    #warning span{
        position: relative;
        margin-right: 0.31rem;
        font-size: 1.75rem;
        font-weight: bold;
        cursor: pointer;
        float: right;
    }
    #warning{
        font-size: 1.25rem;
        color: lightgreen;
        position: absolute;
        z-index: 2;
        width: 100%;
        text-align: center;
        border-radius: 0.25rem;
        border: solid;
        border-color: lightgreen;
        background-color: green;
    }
</style>

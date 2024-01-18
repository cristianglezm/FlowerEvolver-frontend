<template>
    <div class="Header">
        <div v-if="showWarning" role="warning" id="warning"><span @click="showWarning = false">X</span><p>Flowers are deleted daily at 00:00 UTC</p></div>
        <header>
            <a :href="this.base_url" style="text-decoration: none;"><h1>Flower Evolver</h1></a>
        </header>
        <div v-if="isMobile()">
            <img @click="showMenu=!showMenu" src="@/assets/x32/menu.png" alt="menuIcon" class="pointer"/>
            <div v-if="showMenu" class="mobileMenu">
                <nav class="tabs" @click="showMenu=!showMenu" alt="tabs">
                    <ul v-if="isPaginated()">
                        <router-link to="/Demo?page=0"> Demo </router-link>
                        <router-link to="/LastAdded"> Last Added </router-link>
                        <router-link to="/Browse?page=0"> Browse </router-link>
                        <router-link to="/Favourites?page=0"> Favourites </router-link>
                        <router-link to="/Downloads"> Downloads </router-link>
                    </ul>
                    <ul v-else>
                        <router-link to="/Demo"> Demo </router-link>
                        <router-link to="/LastAdded"> Last Added </router-link>
                        <router-link to="/Browse"> Browse </router-link>
                        <router-link to="/Favourites"> Favourites </router-link>
                        <router-link to="/Downloads"> Downloads </router-link>
                    </ul>
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
                    <router-link to="/Demo?page=0"> Demo </router-link>
                    <router-link to="/LastAdded"> Last Added </router-link>
                    <router-link to="/Browse?page=0"> Browse </router-link>
                    <router-link to="/Favourites?page=0"> Favourites </router-link>
                    <router-link to="/Downloads"> Downloads </router-link>
                </ul>
                <ul v-else>
                    <router-link to="/Demo"> Demo </router-link>
                    <router-link to="/LastAdded"> Last Added </router-link>
                    <router-link to="/Browse"> Browse </router-link>
                    <router-link to="/Favourites"> Favourites </router-link>
                    <router-link to="/Downloads"> Downloads </router-link>
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
        <Modal :errors="this.$store.errors" />
    </div>
</template>
<script>
    import { mapActions, mapGetters} from 'pinia';
	import { useFlowersStore } from '../store';
    import Modal from './Modal.vue';
	import { defineComponent } from 'vue';
	
    export default defineComponent({
        name:'Header',
        components:{
            Modal,
        },
        props:{
            isLocal: Boolean,
        },
        data(){
            return {
                blocked: false,
                showWarning: true,
                showMenu: false,
                base_url: import.meta.env.BASE_URL,
            }
        },
        methods:{
            ...mapGetters(useFlowersStore, [
				'getRemoteSelected',
				'getLocalSelected'
            ]),
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
        font-size: 120px;
        padding: 0px 0px 0px 0px;
        margin: 0px 0px 0px 0px;
        color: lightgreen;
    }
    @media only screen and (max-width: 1280px){
        h1{
            font-size: 36px;
            padding: 0px 0px 0px 0px;
            margin: 0px 0px 0px 0px;
            color: lightgreen;
        }
    }
    .Header{
        background-color: green;
        position: relative;
    }
    .tabs ul{
        margin: 0px 0px 0px 0px;
        padding: 0px 0px 0px 0px;
    }
    .tabs a:hover{
        background-color: rgb(37, 39, 41);
    }
    .tabs a{
        text-decoration: none;
        float: left;
        text-indent: 10px;
        padding: 2px 10px 0px 0px;
        margin: 10px 0px 0px 0px;
        color: lightgreen;
        border-radius: 12px 12px 0px 0px;
    }
    .router-link-active{
        background-color: rgb(37, 39, 41);
    }
    .tabs{
        position: relative;
        top: 16px;
        font-size: xx-large;
    }
    @media only screen and (max-width: 1280px){
        .mobileMenu{
            box-shadow: 5px 10px 1px 2px rgba(12, 13, 12, 0.5);
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
            text-indent: 10px;
            padding: 2px 10px 0px 0px;
            margin: 10px 0px 0px 0px;
            color: lightgreen;
            border-radius: 12px 12px 12px 12px;
        }
        .tabs{
            display: flex;
            flex-flow: column wrap;
            top: 0px;
            position: absolute;
            font-size: large;
            z-index: 1;
        }
    }
    .actions{
        text-align: right;
        padding-bottom: 9px;
    }
    .actions button{
        position: relative;
        font-size: 20px;
        border-radius: 315px 335px 155px 135px;
        margin: 10px 10px 0px 2px;
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
            padding-bottom: 9px;
            position: absolute;
            display: flex;
            flex-flow: column wrap;
            z-index: 1;
            right: 120px;
        }
        .actions button{
            font-size: 15px;
            border-radius: 315px 335px 155px 135px;
            margin: 10px 10px 0px 2px;
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
      opacity: 0.6;
      cursor: not-allowed !important;
    }
    #warning span{
        position: relative;
        margin-right: 5px;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        float: right;
    }
    #warning{
        font-size: 20px;
        color: lightgreen;
        position: absolute;
        width: 100%;
        text-align: center;
        border-radius: 4px;
        border: solid;
        border-color: lightgreen;
        background-color: green;
    }
</style>

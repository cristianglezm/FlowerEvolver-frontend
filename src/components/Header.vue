<template>
    <div class="Header">
        <div v-if="showWarning" id="warning"><span @click="showWarning = false">X</span><p>Flowers are deleted daily at 00:00 UTC</p></div>
        <header>
            <a :href="this.base_url" style="text-decoration: none;"><h1>Flower Evolver</h1></a>
        </header>
        <div v-if="isMobile()">
            <img @click="showMenu=!showMenu" src="/x32/menu.png" alt="menuIcon" class="pointer"/>
            <div v-if="showMenu" class="mobileMenu">
                <div class="tabs" @click="showMenu=!showMenu">
                        <router-link to="/Demo">Demo </router-link>
                        <router-link to="/LastAdded">Last Added </router-link>
                        <router-link to="/Browse"> Browse </router-link>
                        <router-link to="/Favourites"> Favourites </router-link>
                        <router-link to="/Downloads"> Downloads </router-link>
                </div>
                <div class="actions">
                    <div v-if="this.$route.path === '/Demo' || blocked" style="display: flex; flex-flow: column wrap;z-index: 1;left: 0px;position: absolute;">
                        <button @click="showMenu=!showMenu" class="disabled">New Flower</button>
                        <button @click="showMenu=!showMenu" class="disabled">Reproduce Selected</button>
                        <button @click="showMenu=!showMenu" class="disabled">Show Selected Descendants</button>
                    </div>
                    <div v-else style="display: flex; flex-flow: column wrap;z-index: 1;left: 0px;position: absolute;">
                        <button @click="block(makeFlower); showMenu=!showMenu">New Flower</button>
                        <button @click="block(reproduce); showMenu=!showMenu">Reproduce Selected</button>
                        <button @click="block(showAncestors); showMenu=!showMenu">Show Selected Descendants</button>
                    </div>
                </div>
            </div>
        </div>
        <div v-else>
            <div class="tabs">
                <ul>
                    <router-link to="/Demo">Demo </router-link>
                    <router-link to="/LastAdded">Last Added </router-link>
                    <router-link to="/Browse"> Browse </router-link>
                    <router-link to="/Favourites"> Favourites </router-link>
                    <router-link to="/Downloads"> Downloads </router-link>
                </ul>
            </div>
            <div class="actions">
                <ul v-if="this.$route.path === '/Demo' || blocked">
                    <button class="disabled">New Flower</button>
                    <button class="disabled">Reproduce Selected</button>
                    <button class="disabled">Show Selected Descendants</button>
                </ul>
                <ul v-else>
                    <button @click="block(makeFlower)">New Flower</button>
                    <button @click="block(reproduce)">Reproduce Selected</button>
                    <button @click="block(showAncestors)">Show Selected Descendants</button>
                </ul>
            </div>
        </div>
        <Modal :errors="this.$store.state.errors" />
    </div>
</template>
<script>
    import { mapActions, mapGetters} from 'vuex'
    import Modal from './Modal.vue';
    export default {
        name:'Header',
        components:{
            Modal,
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
            ...mapGetters([
                'getSelected',
            ]),
            ...mapActions([
                'makeFlower',
                'reproduce',
            ]),
            block: function(Fn){
                this.blocked = true;
                Fn();
                setTimeout(function(){
                    this.blocked = false;
                }.bind(this), 2000);
            },
            showAncestors: function(){
                var selected = this.$store.getters.getSelected;
                if(selected.length < 2){
                    this.$store.state.errors.push({message:'You need to select two flowers'});
                }else{
                    this.$router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1]}});
                }
            },
            isMobile: function(){
                return screen.width <= 1280;
            },
        },
    }
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
            height: 250%;
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

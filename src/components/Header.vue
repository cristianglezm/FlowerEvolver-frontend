<template>
    <div class="Header">
        <div v-if="showWarning" id="warning"><span @click="showWarning = false">X</span><p>Flowers are deleted daily at 00:00 UTC</p></div>
        <header>
            <a :href="this.base_url" style="text-decoration: none;"><h1>Flower Evolver</h1></a>
        </header>
        <div class="tabs">
            <ul>
                <router-link to="/Demo">Demo </router-link>
                <router-link to="/LastAdded">Last Added </router-link>
                <router-link to="/Browse"> Browse </router-link>
                <router-link to="/Favourites"> Favourites </router-link>
                <router-link to="/Downloads"> Downloads </router-link>
            </ul>
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
                base_url: process.env.BASE_URL,
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
    @media only screen and (max-width: 740px){
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
        bottom: 0;
        font-size: xx-large;
    }
    @media only screen and (max-width: 740px){
        .tabs{
            position: relative;
            bottom: 0;
            font-size: large;
        }
    }
    .actions{
        text-align: right;
        padding-bottom: 10px;
    }
    .actions button{
        position: relative;
        font-size: 20px;
        border-radius: 4px;
        margin: 10px 10px 0px 2px;
        cursor: pointer;
        border-color: lightgreen;
        background-color: green;
        color: lightgreen;
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
<template>
    <div class="appMenu">
        <div v-if="isMobile()" style="margin: 0.6rem 0rem 0rem 0rem;">
            <img @click="data.showMenu = !data.showMenu" src="@/assets/x32/menu.png" alt="menuIcon" class="pointer"/>
            <div v-if="data.showMenu" class="mobileMenu">
                <nav v-if="isPaginated()" class="tabs" @click="data.showMenu = !data.showMenu" alt="tabs">
                        <router-link to="/Local?page=0"> Local </router-link>
                        <router-link to="/LastAdded"> Last Added </router-link>
                        <router-link to="/Browse?page=0"> Browse </router-link>
                        <router-link to="/Favourites?page=0"> Favourites </router-link>
                        <router-link to="/Downloads"> Downloads </router-link>
                        <router-link to="/Settings"> Settings </router-link>
                </nav>
                <nav v-else class="tabs" @click="data.showMenu = !data.showMenu" alt="tabs">
                        <router-link to="/Local"> Local </router-link>
                        <router-link to="/LastAdded"> Last Added </router-link>
                        <router-link to="/Browse"> Browse </router-link>
                        <router-link to="/Favourites"> Favourites </router-link>
                        <router-link to="/Downloads"> Downloads </router-link>
                        <router-link to="/Settings"> Settings </router-link>
                </nav>
                <nav class="actions" alt="actions">
                    <div v-if="props.isLocal || data.blocked" style="display: flex; flex-flow: column wrap;z-index: 1;left: 0rem;position: absolute;">
                        <button @click="store.makeLocalFlower(); data.showMenu = !data.showMenu"> New Local Flower</button>
                        <button @click="store.localReproduce(); data.showMenu = !data.showMenu"> Local Reproduce Selected</button>
                        <button @click="showAncestors(); data.showMenu = !data.showMenu"> Show Local Selected Descendants</button>
                    </div>
                    <div v-else style="display: flex; flex-flow: column wrap;z-index: 1;left: 0rem;position: absolute;">
                        <button @click="block(store.makeRemoteFlower); data.showMenu = !data.showMenu"> New Remote Flower</button>
                        <button @click="block(store.remoteReproduce); data.showMenu = !data.showMenu"> Remote Reproduce Selected</button>
                        <button @click="block(showAncestors); data.showMenu = !data.showMenu"> Show Remote Selected Descendants</button>
                    </div>
                </nav>
            </div>
        </div>
        <div v-else :class="{ edgeOrChromeInlined: isEdgeOrChrome() }">
            <nav :class="{ edgeOrChromeTabs: isEdgeOrChrome(), 'tabs': true }" alt="tabs">
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
                <ul v-if="props.isLocal">
                    <button @click="store.makeLocalFlower()"> New Local Flower</button>
                    <button @click="store.localReproduce()"> Local Reproduce Selected</button>
                    <button @click="showAncestors()"> Show Local Selected Descendants</button>
                </ul>
                <ul v-else-if="data.blocked">
                    <button class="disabled"> New Remote Flower</button>
                    <button class="disabled"> Remote Reproduce Selected</button>
                    <button class="disabled"> Show Remote Selected Descendants</button>                
                </ul>
                <ul v-else>
                    <button @click="block(store.makeRemoteFlower)"> New Remote Flower</button>
                    <button @click="block(store.remoteReproduce)"> Remote Reproduce Selected</button>
                    <button @click="block(showAncestors)"> Show Remote Selected Descendants</button>
                </ul>
            </div>
        </div>
        <ErrorModal :errors="store.errors" />
        <ConfirmModal :channel="emitter" :id="'globalConfirm'" :on="'showYesNo'" />
    </div>
</template>

<script setup>

	import { reactive, inject } from 'vue';
	import { useFlowersStore } from '../store';
    import ErrorModal from './ErrorModal.vue';
    import ConfirmModal from './ConfirmModal.vue';
    import { useRouter } from 'vue-router';

    const props = defineProps({
        isLocal: {
            type: Boolean,
            required: true,
            default: false,
        }
    });
    let data = reactive({
        blocked: false,
        showMenu: false
    });
    const emitter = inject('emitter');
    const store = useFlowersStore();
    const router = useRouter();

    const block = (Fn) => {
        if(!data.blocked){
            data.blocked = true;
            Fn();
            setTimeout(function(){
                data.blocked = false;
            }.bind(this), 2000);
        }
    };
    const showAncestors = () =>{
        if(props.isLocal){
            let selected = store.getLocalSelected;
            if(selected.length < 1){
                store.errors.push({message:'You need to select two flowers'});
            }else{
                router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1], isLocal: "local"}});
            }
        }else{
            let selected = store.getRemoteSelected;
            if(selected.length < 1){
                store.errors.push({message:'You need to select two flowers'});
            }else{
                router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1], isLocal: "remote"}});
            }
        }
    };
    const isPaginated = () => {
        return store.settings.pagination;
    };
    const isMobile = () => {
        return window.innerWidth <= 1280;
    };
    const isEdgeOrChrome = () => {
        return navigator.userAgent.indexOf("Edge") > -1 || 
                navigator.userAgent.indexOf("Chrome") > -1;
    };

</script>

<style scoped>
    .appMenu{
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
        background-color: rgb(1, 88, 1);
    }
    .router-link-active{
        background-color: rgb(37, 39, 41) !important;
    }
    .tabs{
        position: relative;
        top: 3.4rem;
        font-size: xx-large;
    }
    .edgeOrChromeInlined{
        display: inline-flex;
        flex-flow: row nowrap;
        width: 100%;
    }
    .edgeOrChromeTabs{
        width: 100%;
        padding: 1.25rem 0rem 0rem 0rem;
    }
    @media only screen and (max-width: 1280px){
        .mobileMenu{
            box-shadow: 0.31rem 0.6rem 0.06rem 0.125rem rgba(12, 13, 12, 0.5);
            width: 100%;
            height: 635%;
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
</style>

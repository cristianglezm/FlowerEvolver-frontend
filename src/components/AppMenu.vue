<template>
  <div>
    <div v-if="isMobile()" class="appMenu" style="margin-top: 1em;">
      <img class="pointer" alt="menuIcon" src="@/assets/x32/menu.png" @click="toggleMenu()">
      <div v-if="data.showMenu" class="mobileMenu">
        <nav v-if="isPaginated()" class="tabs" alt="tabs" @click="toggleMenu()">
          <router-link to="/Local?page=0"> Local </router-link>
          <router-link to="/LastAdded"> Last Added </router-link>
          <router-link to="/Browse?page=0"> Browse </router-link>
          <router-link to="/Favourites?page=0"> Favourites </router-link>
          <router-link to="/Downloads"> Downloads </router-link>
          <router-link to="/Settings"> Settings </router-link>
        </nav>
        <nav v-else class="tabs" alt="tabs" @click="toggleMenu()">
          <router-link to="/Local"> Local </router-link>
          <router-link to="/LastAdded"> Last Added </router-link>
          <router-link to="/Browse"> Browse </router-link>
          <router-link to="/Favourites"> Favourites </router-link>
          <router-link to="/Downloads"> Downloads </router-link>
          <router-link to="/Settings"> Settings </router-link>
        </nav>
        <div class="actions" alt="actions">
          <nav v-if="props.isLocal">
            <button class="safe-button" @click="FlowerStore.makeLocalFlower(); toggleMenu()"> New Local Flower</button>
            <button class="safe-button" @click="FlowerStore.localReproduce(); toggleMenu()"> Local Reproduce Selected</button>
            <button class="safe-button" @click="showAncestors(); toggleMenu()"> Show Local Selected Descendants</button>
            <button class="safe-button" @click="toggleChatBot(); toggleMenu()">{{ toggleButtonMessage }}</button>
          </nav>
          <nav v-else>
            <button class="safe-button" :class="{'disabled': data.blocked}" @click="block(FlowerStore.makeRemoteFlower); toggleMenu()"> New Remote Flower</button>
            <button class="safe-button" :class="{'disabled': data.blocked}" @click="block(FlowerStore.remoteReproduce); toggleMenu()"> Remote Reproduce Selected</button>
            <button class="safe-button" :class="{'disabled': data.blocked}" @click="block(showAncestors); toggleMenu()"> Show Remote Selected Descendants</button>
            <button class="safe-button" @click="toggleChatBot(); toggleMenu()">{{ toggleButtonMessage }}</button>
          </nav>
        </div>
      </div>
    </div>
    <div v-else :class="{ 'edgeOrChromeInlined': isEdgeOrChrome() }">
      <nav :class="{ edgeOrChromeTabs: isEdgeOrChrome(), 'tabs': true }" alt="tabs">
        <div v-if="isPaginated()">
          <router-link to="/Local?page=0"> Local </router-link>
          <router-link to="/LastAdded"> Last Added </router-link>
          <router-link to="/Browse?page=0"> Browse </router-link>
          <router-link to="/Favourites?page=0"> Favourites </router-link>
          <router-link to="/Downloads"> Downloads </router-link>
          <router-link to="/Settings"> Settings </router-link>
        </div>
        <div v-else>
          <router-link to="/Local"> Local </router-link>
          <router-link to="/LastAdded"> Last Added </router-link>
          <router-link to="/Browse"> Browse </router-link>
          <router-link to="/Favourites"> Favourites </router-link>
          <router-link to="/Downloads"> Downloads </router-link>
          <router-link to="/Settings"> Settings </router-link>
        </div>
      </nav>
    </div>
    <div v-if="!isMobile()" class="floating-actions" alt="floating-actions">
      <div class="floating-actions-left">
        <button class="fixed-button left-fixed-button" @click="toggleChatBot()">{{ toggleButtonMessage }}</button>
      </div>
      <div v-if="props.isLocal" class="floating-actions-right">
        <button class="fixed-button right-fixed-button" @click="FlowerStore.makeLocalFlower()"> New Local Flower</button>
        <button class="fixed-button right-fixed-button" @click="FlowerStore.localReproduce()"> Local Reproduce Selected</button>
        <button class="fixed-button right-fixed-button" @click="showAncestors()"> Show Local Selected Descendants</button>
      </div>
      <div v-else class="floating-actions-right">
        <button class="fixed-button right-fixed-button" :class="{'disabled': data.blocked}" @click="block(FlowerStore.makeRemoteFlower)"> New Remote Flower</button>
        <button class="fixed-button right-fixed-button" :class="{'disabled': data.blocked}" @click="block(FlowerStore.remoteReproduce)"> Remote Reproduce Selected</button>
        <button class="fixed-button right-fixed-button" :class="{'disabled': data.blocked}" @click="block(showAncestors)"> Show Remote Selected Descendants</button>
      </div>
    </div>
    <ErrorModal :errors="FlowerStore.errors" />
    <ConfirmModal :id="'globalConfirm'" :channel="emitter" :on="'showYesNo'" />
  </div>
</template>

<script setup>

import { reactive, inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import ErrorModal from './ErrorModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import { useFlowerStore } from '../stores/FlowerStore';

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
const FlowerStore = useFlowerStore();
const router = useRouter();
const toggleButtonMessage = ref(FlowerStore.settings.showChatBot ? "Close ChatBot":"Open ChatBot");

const block = (Fn) => {
    if(!data.blocked){
        data.blocked = true;
        Fn();
        setTimeout(() => {
            data.blocked = false;
        }, 2000);
    }
};
const showAncestors = () => {
    if(props.isLocal){
        let selected = FlowerStore.getLocalSelected;
        if(selected.length < 1){
            FlowerStore.errors.push({message:'You need to select two flowers'});
        }else{
            router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1], isLocal: "local"}});
        }
    }else{
        let selected = FlowerStore.getRemoteSelected;
        if(selected.length < 1){
            FlowerStore.errors.push({message:'You need to select two flowers'});
        }else{
            router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1], isLocal: "remote"}});
        }
    }
};
const toggleMenu = () => {
    data.showMenu = !data.showMenu;
};
const toggleChatBot = () => {
    FlowerStore.settings.showChatBot = !FlowerStore.settings.showChatBot;
    if(FlowerStore.settings.showChatBot){
        toggleButtonMessage.value = "Close ChatBot";
    }else{
        toggleButtonMessage.value = "Open ChatBot";
    }
    FlowerStore.saveSettings();
};
const isPaginated = () => {
    return FlowerStore.settings.pagination;
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
        color: lightgreen;
        display: flex;
        flex-flow: row nowrap;
        width: fit-content;
        height: fit-content;
    }
    .tabs{
        margin: 0rem;
        padding: 0rem;
        font-size: xx-large;
        margin-bottom: -4px;
        margin-top: 1em;
    }
    .tabs a{
        text-decoration: none;
        text-indent: 0.6rem;
        padding: 0.45rem 0.5rem 0rem 0.5rem;
        margin: 0.6rem 0rem 0rem 0rem;
        color: lightgreen;
        border-radius: 0.75rem 0.75rem 0rem 0rem;
        background-color: rgb(1, 88, 1);
        margin-top:-10px;
    }
    .router-link-active, .tabs a:hover{
        background-color: rgb(37, 39, 41) !important;
    }
    .edgeOrChromeInlined{
        display: inline-flex;
        flex-flow: row nowrap;
        width: 100%;
        height: 10%;
    }
    .edgeOrChromeTabs{
        width: 100%;
        height: 10%;
        padding: 1.25rem 0rem 0rem 0rem;
    }
    .actions{
        text-align: right;
        padding-bottom: 0.56rem;
    }
    .floating-actions{
        display: flex;
        flex-flow: column nowrap;
        position: fixed;
        background-color: transparent;
        pointer-events: none;
        width: 100%;
        height: fit-content;
        z-index: 10;
        top: 12%;
    }
    .floating-actions-left{
        left: -25px;
        display: flex;
        flex-flow: column nowrap;
        position: fixed;
        justify-content: space-evenly;
    }
    .floating-actions-right{
        right: -2px;
        display: flex;
        flex-flow: column nowrap;
        justify-content: space-evenly;
        position: fixed;
    }
    .safe-button{
        font-size: 1.25rem;
        border-radius: 19.68rem 20.93rem 9.68rem 8.43rem;
        margin: .6rem .6rem 0rem .125rem;
        cursor: pointer;
        border-color: lightgreen;
        background-color: green;
        color: lightgreen;
    }
    .safe-button:hover{
        background-color: lightgreen;
        border-color: green;
        color: green;
    }
    .fixed-button{
        position: relative;
        font-size: 1.25rem;
        cursor: pointer;
        border-color: lightgreen;
        background-color: rgb(37, 39, 41);
        color: lightgreen;
        z-index: 10;
        width: 180px;
        height: 130px;
        pointer-events: all;
        padding-left: 30px;
        padding-right: 25px;
    }
    .fixed-button:hover{
        background-color: lightgreen;
        border-color: green;
        color: green;
    }
    .left-fixed-button{
        border-radius: 0em  2.0em 2.0em 0.0em;
        transform: translate(-130px, 0%);
        transition: transform 0.5s ease;
    }
    .left-fixed-button:hover{
        transform: translate(2px, 0%);
        transition: transform 0.5s ease;
    }
    .right-fixed-button{
        border-radius: 2em  0.0em 0.0em 2em;
        transform: translate(140px, 0%);
        transition: transform 0.5s ease;
    }
    .right-fixed-button:hover{
        transform: translate(-2px, 0%);
        transition: transform 0.5s ease;
    }
    @media only screen and (max-width: 1280px){
        .mobileMenu{
            box-shadow: 0.31rem 0.6rem 0.06rem 0.125rem rgba(12, 13, 12, 0.5);
            width: 100%;
            height: fit-content;
            position: absolute;
            display: flex;
            flex-flow: row nowrap;
            background-color: rgb(0, 128, 0, 0.8);
            z-index: 1;
            margin-top: 30px;
            padding-bottom: 10px;
        }
        .tabs{
            display: flex;
            flex-flow: column nowrap;
            font-size: 0.9em;
        }
        .tabs a{
            text-decoration: none;
            text-indent: 0.6rem;
            padding: 0.125rem 0.6rem 0rem 0rem;
            margin: 0.6rem 0rem 0rem 0rem;
            color: lightgreen;
            border-radius: 0.75rem;
        }
        .actions{
            padding-bottom: 0.56rem;
            display: flex;
            flex-flow: column nowrap;
            text-align: center;
            padding: 0em 2em 0.5em 5em;
        }
        .safe-button{
            font-size: 0.9rem;
        }
    }
    .disabled{
      opacity: 0.5;
      cursor: not-allowed !important;
    }
</style>

<template>
  <div>
    <div v-if="isMobile()" class="appMenu" style="margin-top: 1em;">
      <img class="pointer" alt="menuIcon" src="@/assets/x32/menu.png" data-testid="menu-toggle" @click="toggleMenu()">
      <div v-if="data.showMenu" class="mobileMenu">
        <nav v-if="isPaginated()" class="tabs" alt="tabs" @click="toggleMenu()">
          <router-link to="/Local?page=0"> Local </router-link>
          <router-link to="/LastAdded"> Last Added </router-link>
          <router-link to="/Browse?page=0"> Browse </router-link>
          <router-link to="/Favourites?page=0"> Favourites </router-link>
          <router-link to="/Species?page=0"> Species </router-link>
          <router-link to="/Charts"> Charts </router-link>
          <router-link to="/Downloads"> Downloads </router-link>
          <router-link to="/Settings"> Settings </router-link>
        </nav>
        <nav v-else class="tabs" alt="tabs" @click="toggleMenu()">
          <router-link to="/Local"> Local </router-link>
          <router-link to="/LastAdded"> Last Added </router-link>
          <router-link to="/Browse"> Browse </router-link>
          <router-link to="/Favourites"> Favourites </router-link>
          <router-link to="/Species"> Species </router-link>
          <router-link to="/Charts"> Charts </router-link>
          <router-link to="/Downloads"> Downloads </router-link>
          <router-link to="/Settings"> Settings </router-link>
        </nav>
        <div class="actions" alt="actions">
          <nav v-if="props.isLocal">
            <SafeButton data-testid="menu-new-local-flower" @click="LocalFlowerStore.makeLocalFlower(); toggleMenu()"> New Local Flower</SafeButton>
            <SafeButton data-testid="menu-local-reproduce" @click="LocalFlowerStore.localReproduce(); toggleMenu()"> Local Reproduce Selected</SafeButton>
            <SafeButton data-testid="menu-show-local-descendants" @click="showDescendants(); toggleMenu()"> Show Local Selected Descendants</SafeButton>
            <SafeButton data-testid="menu-toggle-chatbot" @click="toggleChatBot(); toggleMenu()">{{ toggleButtonMessage }}</SafeButton>
          </nav>
          <nav v-else>
            <SafeButton data-testid="menu-new-remote-flower" :disabled="data.blocked" @click="block(RemoteFlowerStore.makeRemoteFlower); toggleMenu()"> New Remote Flower</SafeButton>
            <SafeButton data-testid="menu-remote-reproduce" :disabled="data.blocked" @click="block(RemoteFlowerStore.remoteReproduce); toggleMenu()"> Remote Reproduce Selected</SafeButton>
            <SafeButton data-testid="menu-show-remote-descendants" :disabled="data.blocked" @click="block(showDescendants); toggleMenu()"> Show Remote Selected Descendants</SafeButton>
            <SafeButton data-testid="menu-toggle-chatbot" @click="toggleChatBot(); toggleMenu()">{{ toggleButtonMessage }}</SafeButton>
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
          <router-link to="/Species?page=0"> Species </router-link>
          <router-link to="/Charts"> Charts </router-link>
          <router-link to="/Downloads"> Downloads </router-link>
          <router-link to="/Settings"> Settings </router-link>
        </div>
        <div v-else>
          <router-link to="/Local"> Local </router-link>
          <router-link to="/LastAdded"> Last Added </router-link>
          <router-link to="/Browse"> Browse </router-link>
          <router-link to="/Favourites"> Favourites </router-link>
          <router-link to="/Species"> Species </router-link>
          <router-link to="/Charts"> Charts </router-link>
          <router-link to="/Downloads"> Downloads </router-link>
          <router-link to="/Settings"> Settings </router-link>
        </div>
      </nav>
    </div>
    <template v-if="!isMobile()">
      <FixedButtons side="left">
        <FixedButton data-testid="menu-toggle-chatbot" @click="toggleChatBot()">{{ toggleButtonMessage }}</FixedButton>
      </FixedButtons>
      <FixedButtons v-if="props.isLocal" side="right">
        <FixedButton data-testid="menu-new-local-flower" @click="LocalFlowerStore.makeLocalFlower()">New Local Flower</FixedButton>
        <FixedButton data-testid="menu-local-reproduce" @click="LocalFlowerStore.localReproduce()">Local Reproduce Selected</FixedButton>
        <FixedButton data-testid="menu-show-local-descendants" @click="showDescendants()">Show Local Selected Descendants</FixedButton>
      </FixedButtons>
      <FixedButtons v-else side="right">
        <FixedButton data-testid="menu-new-remote-flower" :disabled="data.blocked" @click="block(RemoteFlowerStore.makeRemoteFlower)">New Remote Flower</FixedButton>
        <FixedButton data-testid="menu-remote-reproduce" :disabled="data.blocked" @click="block(RemoteFlowerStore.remoteReproduce)">Remote Reproduce Selected</FixedButton>
        <FixedButton data-testid="menu-show-remote-descendants" :disabled="data.blocked" @click="block(showDescendants)">Show Remote Selected Descendants</FixedButton>
      </FixedButtons>
    </template>
    <ErrorModal />
    <ConfirmModal :id="'globalConfirm'" :channel="emitter" :on="'showYesNo'" />
  </div>
</template>

<script setup>

import { reactive, inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import ErrorModal from './ErrorModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import { useLocalFlowerStore } from '../stores/LocalFlowerStore';
import { useRemoteFlowerStore } from '../stores/RemoteFlowerStore';
import { useSettingsStore } from '../stores/SettingsStore';
import { useErrorStore } from '../stores/ErrorStore';
import SafeButton from './ui/SafeButton.vue';
import FixedButton from './ui/FixedButton.vue';
import FixedButtons from './ui/FixedButtons.vue';

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
const LocalFlowerStore = useLocalFlowerStore();
const RemoteFlowerStore = useRemoteFlowerStore();
const SettingsStore = useSettingsStore();
const ErrorStore = useErrorStore();
const router = useRouter();
const toggleButtonMessage = ref(SettingsStore.settings.showChatBot ? "Close ChatBot":"Open ChatBot");

const block = (Fn) => {
    if(!data.blocked){
        data.blocked = true;
        Fn();
        setTimeout(() => {
            data.blocked = false;
        }, 2000);
    }
};
const showDescendants = () => {
    if(props.isLocal){
        let selected = LocalFlowerStore.getLocalSelected;
        if(selected.length < 1){
            ErrorStore.push('You need to select two flowers');
        }else{
            router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1], isLocal: "local"}});
        }
    }else{
        let selected = RemoteFlowerStore.getRemoteSelected;
        if(selected.length < 1){
            ErrorStore.push('You need to select two flowers');
        }else{
            router.push({name:'DescendantsFatherAndMother', params:{father:selected[0], mother:selected[1], isLocal: "remote"}});
        }
    }
};
const toggleMenu = () => {
    data.showMenu = !data.showMenu;
};
const toggleChatBot = () => {
    SettingsStore.settings.showChatBot = !SettingsStore.settings.showChatBot;
    if(SettingsStore.settings.showChatBot){
        toggleButtonMessage.value = "Close ChatBot";
    }else{
        toggleButtonMessage.value = "Open ChatBot";
    }
    SettingsStore.saveSettings();
};
const isPaginated = () => {
    return SettingsStore.settings.pagination;
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
        background-color: var(--fe-green);
        color: var(--fe-lightgreen);
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
        color: var(--fe-lightgreen);
        border-radius: 0.75rem 0.75rem 0rem 0rem;
        background-color: var(--fe-menu-bar);
        margin-top:-10px;
    }
    .router-link-active, .tabs a:hover{
        background-color: var(--fe-surface) !important;
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
        --fe-button-margin: .6rem .6rem 0rem .125rem;
        text-align: right;
        padding-bottom: 0.56rem;
    }
    @media only screen and (max-width: 1280px){
        .mobileMenu{
            box-shadow: 0.31rem 0.6rem 0.06rem 0.125rem var(--fe-shadow-card);
            width: 100%;
            height: fit-content;
            position: absolute;
            display: flex;
            flex-flow: row nowrap;
            background-color: var(--fe-menu-overlay);
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
            color: var(--fe-lightgreen);
            border-radius: 0.75rem;
        }
        .actions{
            padding-bottom: 0.56rem;
            display: flex;
            flex-flow: column nowrap;
            text-align: center;
            padding: 0em 2em 0.5em 5em;
        }
    }
</style>

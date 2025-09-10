<template>
  <div id="cacheManager">
    <h2>Cache Manager</h2>
    <div class="columns">
      <div class="column">
        <h3>Hosts</h3>
        <select v-model="data.selectedHost" class="styled-select" size="8" @change="loadHostFiles">
          <option v-for="host in data.hosts" :key="host" :value="host">
            {{ host }}
          </option>
        </select>
      </div>
      <div class="column">
        <h3>Files</h3>
        <select v-model="data.selectedFiles" class="styled-select" multiple size="8">
          <option v-for="file in data.cacheItems" :key="file" :value="file">
            {{ file }}
          </option>
        </select>
      </div>
    </div>
    <div class="buttons">
      <button class="unsafe-button" :disabled="!data.selectedHost" @click="deleteCacheHost(data.selectedHost)">
        Delete Selected Host
      </button>
      <button class="unsafe-button" :disabled="!data.selectedFiles.length" @click="deleteCacheFiles(data.selectedHost, data.selectedFiles)">
        Delete Selected Files
      </button>
    </div>
    <ConfirmModal :id="'cache-manager-confirm-modal'" :channel="emitter" :on="'CacheManager#ConfirmModal'" />
  </div>
</template>
  
<script setup>
  /**
   * CacheManager Component
   * Vue component for managing cache by allowing users to select hosts and associated files to delete.
   * 
   * @component CacheManager
   * @prop {String} cacheName - The name of the cache to manage.
   * @event on-delete-host - Emitted when a cache host or files are deleted.
   * @event on-delete-files - Emitted when a cache files are deleted.
   * 
   * @example
   * // Usage in a parent component or view
   * <template>
   *    <CacheManager :cacheName="'myCache'" @on-delete-host="handleDeleteHost" @on-delete-files="handleDeleteFiles"/>
   * </template>
   */
  import { onMounted, reactive } from 'vue';
  import { CacheManager as CM } from '../stores/CacheManager';
  import ConfirmModal from './ConfirmModal.vue';
  import mitt from 'mitt';
  
  const emit = defineEmits(['on-delete-host', 'on-delete-files']);

  let props = defineProps({
      cacheName: {
          type: String,
          required: true
      }
  });
  
  const cm = new CM(props.cacheName);
  const emitter = new mitt();

  let data = reactive({
      hosts: [],
      cacheItems: [],
      selectedHost: "",
      selectedFiles: []
  });
  
  const loadCacheInfo = async () => {
      await cm.initCache(props.cacheName);
      data.hosts = Array.from(cm.cacheHosts.keys());
  };
  
  const loadHostFiles = () => {
      data.cacheItems = cm.cacheHosts.get(data.selectedHost) || [];
      data.selectedFiles = [];
  };
  
const deleteCacheHost = async (host) => {
    if(!host) return;
        emitter.emit('CacheManager#ConfirmModal', {
            title: 'delete Host files',
            message: 'Are you sure you want to delete the selected host files?',
            btnNo: 'no',
            btnYes: 'delete Host from cache.',
            onConfirm: async () => {
                await cm.deleteHost(host);
                data.hosts = Array.from(cm.cacheHosts.keys());
                data.selectedHost = "";
                data.cacheItems = [];
                data.selectedFiles = [];
                emit('on-delete-host');
            }
        });
  };
  
  const deleteCacheFiles = async (host, files) => {
      if(!host || !files.length) return;
        emitter.emit('CacheManager#ConfirmModal', {
            title: 'delete Host files',
            message: 'Are you sure you want to delete ' + data.selectedFiles + '?',
            btnNo: 'no',
            btnYes: 'delete selected files from cache.',
            onConfirm: async () => {
                await cm.deleteFilesFrom(host, files);
                loadHostFiles();
                emit('on-delete-files');
            }
        });
  };
  
  onMounted(() => {
      loadCacheInfo();
  });
  </script>
  
  <style scoped>
    #cacheManager {
        padding: 1.25rem;
    }
    h2{
        text-align: center;
    }
    .columns {
        display: flex;
        gap: 1.25rem;
        margin-bottom: 0.9rem;
        justify-content: center;
    }
    .column {
        width: 12.5em;
        padding: 0.625em;
        border: 0.25em solid lightgreen;
        border-radius: 0.5rem;
        overflow-y: auto;
    }
    .column h3{
        text-align: center;
    }
    .buttons{
        display: flex;
        gap: 1.25em;
        justify-content: center;
        margin-top: 0.9em;
    }
    .unsafe-button{
        position: relative;
        font-size: 1.25rem;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        margin: 0.6rem 0.6rem 0rem 1.25rem;
        cursor: pointer;
        border-color: whitesmoke;
        background-color: red;
        color: whitesmoke;
    }
    .unsafe-button:hover{
        border-color: red;
        background-color: whitesmoke;
        color: red;
    }
    button:disabled{
        background-color: red;
        opacity: 0.5;
        cursor: not-allowed !important;
    }
    @media only screen and (max-width: 1280px){
        .safe-button{
            font-size: 0.9rem;
        }
        .unsafe-button{
            font-size: 0.9rem;
        }
    }
    .styled-select{
        background-color: lightgreen;
        color: green;
        border: solid green;
        padding: 0.5rem;
        font-size: 1.0rem;
        width: 100%;
        overflow: auto;
        border-radius: 2.5em;
    }
    .styled-select::selection{
      background-color: green;
      color:lightgreen;
      cursor: pointer;
    }
    .styled-select:focus-within::selection{
      background-color: lightgreen;
      color: green;
    }
    .styled-select:hover{
        background-color: lightgreen;
        color: green;
    }
    .styled-select:focus{
        outline: none;
        background-color: lightgreen;
        color: green;
    }
    .styled-select::after{
        content: '▼';
        position: absolute;
        right: 0.625rem;
        pointer-events: none;
        transition: 0.2s ease;
    }
    .styled-select select::selection, .styled-select option:checked{
      background-color: green;
      color: lightgreen;
    }
    .styled-select option:hover{
      background-color: green;
      color:lightgreen;
      cursor: pointer;
    }
    .styled-select option::selection{
      background-color: green;
      color: lightgreen;
    }
  </style>
  

<template>
  <div class="three-d-flower-container">
    <div ref="threeCVS" :style="`width:${props.width}px; height:${props.height}px`" />
    <Spinner v-if="isLoading" :message="props.emissive ? 'Building E3D flower...': 'Building 3D flower...'" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { useFlowerStore, FEParams } from "../stores/FlowerStore";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import Spinner from './Spinner.vue';

const props = defineProps({
  genome: {
    type: String,
    required: true,
  },
  id: {
    type: Number,
    required: true,
  },
  width: {
    type: Number,
    required: false,
    default: 128,
  },
  height: {
    type: Number,
    required: false,
    default: 192,
  },
  emissive:{
    type: Boolean,
    required: false,
    default: false
  }
});

let animationFrameId = null;
let renderer = null;
let controls = null;
let composer = null;
let scene = null;

let threeCVS = ref(null);
let isLoading = ref(true);
const flowerStore = useFlowerStore();

const _loadModel = async (gltfUrl) => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      gltfUrl,
      (gltf) => {
        resolve(gltf);
      },
      (_progress) => {},
      (error) => {
        reject(error);
      },
    );
  });
};

const parseModel = async (gltfData) => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(
      gltfData,
      "",
      (gltf) => {
        resolve(gltf);
      },
      (error) => {
        reject(error);
      },
    );
  });
};
/**
 * Traverse the scene, find Petal meshes, and add lights from their userData.
 * @param {THREE.Scene} scene - Your loaded Three.js scene
 */
const addPetalLights = (scene) => {
  scene.traverse((obj) => {
    if(obj.isMesh && obj.name.startsWith('Petal')){
      const lightDefs = obj.userData?.lights;
      if(!Array.isArray(lightDefs)){
        return;
      }
      lightDefs.forEach(def => {
        const light = new THREE.PointLight(def.color, def.intensity, def.radius, def.decay);
        light.position.set(def.position[0], def.position[1], def.position[2]);
        light.castShadow = true;
        obj.add(light);
      });
    }
  });
};

const cleanUp = (scene, renderer, controls, composer, animationFrameId) => {
  if(animationFrameId != null){
    cancelAnimationFrame(animationFrameId);
  }
  if(controls?.dispose){
    controls.dispose();
  }
  if(composer){
    composer.passes.forEach(pass => {
      if(pass.dispose){
        pass.dispose();
      }
    });
    composer.dispose();
  }
  if(renderer?.dispose){
    renderer.dispose();
  }
  if(scene){
    scene.traverse(child => {
      if(!child.isMesh){
        return;
      }
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(mat => {
        for(const key in mat){
          const prop = mat[key];
          if(prop && prop.isTexture){
            prop.dispose();
          }
        }
        mat.dispose();
      });
    });
    scene.clear();
  }
};

onMounted(async () => {
    if(!threeCVS.value){
      throw Error("canvas not initialized");
    }
    scene = new THREE.Scene();
    if(!props.emissive){
      scene.background = new THREE.Color(0xadd8e6);
    }else{
      scene.background = new THREE.Color(0x000000);
    }

    const width = threeCVS.value.clientWidth;
    const height = threeCVS.value.clientHeight;

    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      1e-6,
      1000,
    );
    camera.lookAt(0, 0.5, 0);
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    if(props.emissive){
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.9));
    }
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.015;
    controls.target.set(0, 0.5, 0);

    const gridHelper = new THREE.GridHelper(100, 100);
    scene.add(gridHelper);

    threeCVS.value.appendChild(renderer.domElement);
    let fe = flowerStore.fe;
    fe.setParams(
      new FEParams(
          flowerStore.settings.params.radius,
          flowerStore.settings.params.numLayers,
          flowerStore.settings.params.P,
          flowerStore.settings.params.bias,
      ),
    );
    let genome = props.genome;
    if(props.genome.endsWith(".json")){
      const BACKEND_URL = import.meta.env.VITE_APP_DOWNLOAD_URL;
      const blob = await fetch(BACKEND_URL + props.genome);
      genome = await blob.text();
    }
    let FlowerStats = fe.getFlowerStats(genome, 0.3, 25, 2, 0);
    let gltfFlower;
    if(props.emissive){
       gltfFlower = await fe.drawEmissive3DFlower(genome, props.id.toString(), FlowerStats.sex);
    }else{
       gltfFlower = await fe.draw3DFlower(genome, props.id.toString(), FlowerStats.sex);
    }
    const object = await parseModel(gltfFlower);
    object.scene.scale.set(1.0, 1.0, 1.0);
    object.scene.position.set(0, 0, 0);
    object.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object.scene);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    const padding = 2.3;
    camera.position.y = center.y + cameraDistance * padding; 
    camera.position.x = center.x;
    camera.position.z = center.z;
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
    object.scene.castShadow = true;
    if(!props.emissive){
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(3, 5, -2);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        const planeSize = 100;
        directionalLight.shadow.camera.far = planeSize * 3;
        directionalLight.shadow.camera.left = -planeSize;
        directionalLight.shadow.camera.right = planeSize;
        directionalLight.shadow.camera.top = planeSize;
        directionalLight.shadow.camera.bottom = -planeSize;
        directionalLight.shadow.bias = -0.0005;
        scene.add(directionalLight);
        const helper = new THREE.DirectionalLightHelper(directionalLight, 2);
        scene.add(helper);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffa500, 2, 10);
        pointLight.position.set(2, 2, 2);
        scene.add(pointLight);
    }else{
      addPetalLights(object.scene);
    }
    scene.add(object.scene);
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      if(props.emissive){
        composer.render();
      }else{
        renderer.render(scene, camera);
      }
    }
    isLoading.value = false;
    animate();
});
onUnmounted(() => {
  cleanUp(scene, renderer, controls, composer, animationFrameId);
});
</script>

<style scoped>
.three-d-flower-container{
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}
.loading-overlay{
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
  justify-content: center;
  background-color: rgb(37, 39, 41);
}
</style>

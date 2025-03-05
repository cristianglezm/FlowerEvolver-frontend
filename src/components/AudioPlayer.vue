<template>
  <div class="audio-player" :class="{'audio-player-border': isPlaying}">
    <div v-show="!isPlaying">
      <button 
        class="safe-button reg-btn" 
        :class="{'disabled': props.isAudioPlaying}"
        :disabled="props.isAudioPlaying"
        @click="playAudio"
      >
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" class="svg-icon svg-icon-fill" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M7 7.638v8.724c0 1.294 1.464 2.075 2.577 1.376l6.94-4.363a1.615 1.615 0 0 0 0-2.75l-6.94-4.363C8.464 5.562 7 6.344 7 7.638Z" clip-rule="evenodd" />
          </svg>
        </span>
      </button>
    </div>
    <div v-show="isPlaying" class="inline">
      <button class="safe-button reg-btn" @click="stopAudio">
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" class="svg-icon svg-icon-fill" viewBox="0 0 24 24">
            <rect width="100%" height="100%" />
          </svg>
        </span>
      </button>
      <div class="canvas-container" :style="{ width: width + 'px', height: props.height + 'px' }">
        <canvas ref="bgCanvas" class="bg-canvas" :width="width" :height="props.height" />
        <canvas ref="fgCanvas" class="fg-canvas" :width="width" :height="props.height" />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * @brief A Vue.js component for rendering real-time or static audio waveforms from the kokoroStore
 * @props
 * @prop {String} audio-key - The unique key for the audio file. (required)
 * @prop {HTMLAudioElement} audio-player - The HTML audio element for playback. (required)
 * @prop {Boolean} isAudioPlaying - Indicates if the audio is currently playing. (required)
 * @prop {String} mode - The rendering mode. 
 *                Default: "wf". Options: "wf", "rt".
 * @prop {String} render-mode - Rendering style for real-time visualization. 
 *                Default: "bars". Options: "bars", "lines", "wave", "wave-stroke", "circle", "dots", "mirror", "fireworks".
 * @prop {Number} render-sample-range - The range of audio samples to include for rendering. Default: 5.
 * @prop {Number} max-width - The maximum width of the waveform canvas. Default: 250.
 * @prop {Number} height - The height of the waveform canvas. Default: 64.
 *
 *
 * @usage
 * Static waveform rendering example:
 * <AudioPlayer 
 *   :audio-key="message.content"
 *   :audio-player="audioPlayer"
 *   :is-audio-playing="data.processingAudio"
 *   :mode="'wf'"
 *   :max-width="200"
 *   :height="16"
 *   @on-request-audio="requestAudio"
 * />
 *
 * Real-time rendering with 'bars':
 * <AudioPlayer 
 *   :audio-key="message.content"
 *   :audio-player="audioPlayer"
 *   :is-audio-playing="data.processingAudio"
 *   :mode="'rt'"
 *   :render-mode="'bars'"
 *   :render-sample-range="5"
 *   :max-width="200"
 *   :height="16"
 *   @on-request-audio="requestAudio"
 * />
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import WaveformData from 'waveform-data';
import { useKokoroStore } from '../stores/KokoroStore';
import { useErrorStore } from '../stores/ErrorStore';

const props = defineProps({
  audioKey: {
      type: String,
      required: true,
  },
  audioPlayer:{
      type: HTMLAudioElement,
      required: true,
  },
  isAudioPlaying:{
      type: Boolean,
      required: true
  },
  mode:{
      type: String,
      required: false,
      default: "wf"
  },
  renderMode:{
      type: String,
      required: false,
      default: "bars"
  },
  renderSampleRange:{
      type: Number,
      required: false,
      default: 5
  },
  maxWidth:{
      type: Number,
      required: false,
      default: 250
  },
  height: {
      type: Number,
      required: false,
      default: 64,
  }
});
const emit = defineEmits(['onRequestAudio']);
const kokoroStore = useKokoroStore();
let bgCanvas = ref(null);
let fgCanvas = ref(null);
let isPlaying = ref(false);
let progress = ref(0);
let sound = ref(null);
let canvasDrawn = false;
let fgCtx = null;
let bgCtx = null;
let waveform = null;
let width = ref(250);
let animationFrameId = null;
let audioContext = new (window.AudioContext || window.webkitAudioContext)();

/**
 * @brief Loads waveform data from the specified audio URL asynchronously.
 * @param {String} audioUrl - The URL of the audio file to load and process.
 * @returns {Promise<void>} - A promise that resolves when the waveform data is successfully loaded.
 */
const loadWaveformData = async (audioUrl) => {
    if(waveform){
      return waveform;
    }
    if(audioUrl){
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const options = {
          audio_context: audioContext,
          array_buffer: arrayBuffer,
          scaleY: props.height,
          scaleX: width.value
        };
        return await new Promise((resolve, reject) => {
            WaveformData.createFromAudio(options, 
              (err, waveform) => {
                  if(err){
                      reject(err);
                  }else{
                      resolve(waveform);
                  }
              });
        });
    }
    return null;
};
/**
 * @brief Resets the foreground canvas by clearing it and redrawing the background canvas.
 */
const resetFGCanvas = () => {
  if(canvasDrawn){
    fgCtx.clearRect(0, 0, fgCanvas.value.width, fgCanvas.value.height);
    fgCtx.drawImage(bgCanvas.value, 0, 0);
  }
};
/**
 * @brief Renders the audio samples in real time on the canvas.
 * @param {Number} position - The position in the audio data to start rendering from.
 * @param {String} mode - The rendering mode (options: "bars", "lines", "wave", "wave-stroke", "circle", "dots", "mirror", "fireworks").
 * @param {Number} sampleRange - The range of samples to include on either side of the given position.
 */
const render = (position, mode = "bars", sampleRange = 5) => {
    if (!waveform || !fgCtx || waveform.length === 0) {
        return;
    }
    const barWidth = 4;
    const lineWidth = 2;
    const gap = 2;
    const totalBars = Math.floor(width.value / (barWidth + gap));
    const totalLines = Math.floor(width.value / (lineWidth + gap));
    fgCtx.clearRect(0, 0, fgCanvas.value.width, fgCanvas.value.height);
    const channel = waveform.channel(0);
    const totalElements = mode === "bars" || mode === "dots" ? totalBars : totalLines;
    const elementWidth = mode === "bars" || mode === "dots" ? barWidth : lineWidth;
    for(let index = 0; index < totalElements; ++index){
        const samplePosition = position + (index - Math.floor(totalElements / 2));
        if(samplePosition < 0 || samplePosition >= waveform.length){
            continue;
        }
        let minSample = Infinity;
        let maxSample = -Infinity;
        for(let i = -sampleRange; i <= sampleRange; ++i){
            const sampleIndex = samplePosition + i;
            if(sampleIndex >= 0 && sampleIndex < waveform.length){
                minSample = Math.min(minSample, channel.min_sample(sampleIndex));
                maxSample = Math.max(maxSample, channel.max_sample(sampleIndex));
            }else{
                maxSample = Math.max(maxSample, 0);
                minSample = Math.min(minSample, 0);
            }
        }
        const range = maxSample - minSample;
        const elementHeight = (range / 4.0) * fgCanvas.value.height;
        const x = index * (elementWidth + gap);
        const y1 = fgCanvas.value.height / 2.0 - elementHeight / 4.0;
        const y2 = fgCanvas.value.height / 2.0 + elementHeight / 4.0;
        const gradient = fgCtx.createLinearGradient(x, y1, x, y2);
        gradient.addColorStop(0, "lightgreen");
        gradient.addColorStop(1, "green");
        fgCtx.fillStyle = gradient;
        fgCtx.strokeStyle = gradient;
        fgCtx.lineWidth = lineWidth;
        if(mode === "lines"){
            fgCtx.beginPath();
            fgCtx.moveTo(x, y1);
            fgCtx.lineTo(x, y2);
            fgCtx.stroke();
        }else if(mode === "wave"){
            fgCtx.beginPath();
            let yCenter = fgCanvas.value.height / 2.0;
            fgCtx.arc(x, yCenter, elementHeight / 4.0, 0, Math.PI * 2.0);
            fgCtx.closePath();
            fgCtx.fill();
        }else if(mode === "wave-stroke"){
            fgCtx.beginPath();
            let yCenter = fgCanvas.value.height / 2.0;
            fgCtx.arc(x, yCenter, elementHeight / 8.0, 0, Math.PI * 2.0);
            fgCtx.closePath();
            fgCtx.stroke();
        }else if(mode === "circle"){
            const radius = fgCanvas.value.width / elementHeight + elementHeight / fgCanvas.value.width;
            const angle = (index / totalElements) * Math.PI * 2.0;
            const cx = fgCanvas.value.width / 2.0 + radius * Math.cos(angle);
            const cy = fgCanvas.value.height / 2.0 + radius * Math.sin(angle);
            fgCtx.beginPath();
            fgCtx.arc(cx, cy, elementWidth, 0, Math.PI * 2.0);
            fgCtx.closePath();
            fgCtx.fill();
        }else if(mode === "dots"){
            fgCtx.beginPath();
            fgCtx.arc(x, fgCanvas.value.height / 2.0, elementHeight * 0.0008 + elementWidth, 0, Math.PI * 2.0);
            fgCtx.closePath();
            fgCtx.fill();
        }if(mode === "mirror"){
            fgCtx.fillRect(x, y1, barWidth, elementHeight * 0.5);
            fgCtx.fillRect(x, fgCanvas.value.height - y1, barWidth, elementHeight * 0.5);
        }else if(mode === "fireworks"){
            const particles = 10;
            for(let i = 0; i < particles; ++i){
                const angle = (i / particles) * Math.PI * 2.0;
                const px = x + Math.cos(angle) * (elementHeight / 4.0);
                const py = fgCanvas.value.height / 2.0 + Math.sin(angle) * (elementHeight / 4.0);
                fgCtx.beginPath();
                fgCtx.arc(px, py, elementWidth / 2.0, 0.0, Math.PI * 2.0);
                fgCtx.closePath();
                fgCtx.fill();
            }
        }else if(mode === "bars"){
            fgCtx.fillRect(x, y1, barWidth, elementHeight);
        }
    }
};
/**
 * @brief draws the static waveform.
 */
const drawWaveform = () => {
    if(!waveform || !bgCtx || !fgCtx || canvasDrawn || (waveform.length === 0)){
        return;
    }
    bgCtx.fillStyle = 'green';
    bgCtx.strokeStyle = 'lightgreen';
    bgCtx.lineWidth = 2;
    bgCtx.clearRect(0, 0, bgCanvas.value.width, bgCanvas.value.height);
    bgCtx.beginPath();
    const channel = waveform.channel(0);
    const scaleY = (amplitude, height) => {
        const range = props.height;
        const offset = (range / 2);
        return height - ((amplitude + offset) * height) / range;
    };
    const sampleStep = Math.max(1, Math.ceil(waveform.length / width.value));
    // Use two loops to create a closed shape for filling.
    for(let x = 0; x < width.value; ++x){
        let minSample = Infinity;
        let maxSample = -Infinity;
        for(let i = 0; i < sampleStep; ++i){
            const index = x * sampleStep + i;
            if(index < waveform.length){
                maxSample = Math.max(maxSample, channel.max_sample(index));
                minSample = Math.min(minSample, channel.min_sample(index));
            }else{
                maxSample = Math.max(maxSample, 0);
                minSample = Math.min(minSample, 0);
            }
        }
        bgCtx.lineTo(x + 0.5, scaleY(maxSample / 4, bgCanvas.value.height) + 0.5);
    }
    for(let x = width.value - 1; x >= 0; --x){
        let minSample = Infinity;
        let maxSample = -Infinity;
        for(let i = 0; i < sampleStep; ++i){
            const index = x * sampleStep + i;
            if(index < waveform.length){
                maxSample = Math.max(maxSample, channel.max_sample(index));
                minSample = Math.min(minSample, channel.min_sample(index));
            }else{
                maxSample = Math.max(maxSample, 0);
                minSample = Math.min(minSample, 0);
            }
        }
        bgCtx.lineTo(x + 0.5, scaleY(minSample / 4, bgCanvas.value.height) + 0.5);
    }
    bgCtx.closePath();
    bgCtx.stroke();
    bgCtx.fill();
    fgCtx.clearRect(0, 0, fgCanvas.value.width, fgCanvas.value.height);
    fgCtx.drawImage(bgCanvas.value, 0, 0);
    canvasDrawn = true;
};
/**
 * @brief Updates the progress of the foreground canvas (fgCanvas). If the mode is 'rt' (real-time), 
 * it renders the audio wave. For other modes, it updates the visual progress bar by removing the foreground.
 */
const updateProgress = () => {
    if(!sound.value || !fgCtx){
        return;
    }
    progress.value = sound.value.currentTime / sound.value.duration;
    if(props.mode === "rt" && isPlaying.value){
        const position = Math.floor(progress.value * width.value);
        render(position, props.renderMode, props.renderSampleRange);
    }else if(isPlaying.value){
        const adjustedProgress = progress.value * width.value;
        fgCtx.clearRect(0, 0, adjustedProgress, fgCanvas.value.height);
    }
    isPlaying.value = !(sound.value.currentTime >= sound.value.duration);
    if(isPlaying.value){
        animationFrameId = requestAnimationFrame(updateProgress);
    }else{
        if(animationFrameId){
            cancelAnimationFrame(animationFrameId);
        }
    }
};
/**
 * @brief Initiates playback of the audio and updates the canvas in real time.
 */
const playAudio = async () => {
    const audioUrl = await kokoroStore.getAudio(props.audioKey);
    if(audioUrl && !isPlaying.value){
        sound.value.src = audioUrl;
        try{
            waveform = await loadWaveformData(audioUrl);
            if(canvasDrawn){
                resetFGCanvas();
            }else{
                width.value = Math.min(waveform.length, props.maxWidth);
                bgCanvas.value.width = width.value;
                bgCanvas.value.height = props.height;
                fgCanvas.value.width = width.value;
                fgCanvas.value.height = props.height;
                // wait to update canvas
                await nextTick();
                if(props.mode !== "rt"){
                    drawWaveform();
                }
                // wait to show drawn canvas
                await nextTick();
            }
        }catch(_){
            const ErrorStore = useErrorStore();
            ErrorStore.push("Error loading waveform for audio " + props.audioKey);
        }
    }else if(!audioUrl){
        emit('onRequestAudio', props.audioKey);
        return;
    }
    if(sound.value){
        await sound.value.play();
    }
    isPlaying.value = true;
    updateProgress();
};
/**
 * @brief Stops the audio playback and halts canvas rendering.
 */
const stopAudio = async () => {
    if(sound.value && isPlaying.value){
        sound.value.pause();
        isPlaying.value = false;
        if(animationFrameId){
            cancelAnimationFrame(animationFrameId);
        }
    }
};
const isInsideCanvas = (x, y, rect) => {
    return (x >= rect.left) && 
           (x <= rect.right) && 
           (y >= rect.top) && 
           (y <= rect.bottom);
};
const calculateProgress = (x, rect) => {
    return (x - rect.left) / rect.width;
};
const handleClick = (event) => {
    const rect = fgCanvas.value.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if(isInsideCanvas(x, y, rect)){
        resetFGCanvas();
        const progress = calculateProgress(x, rect);
        sound.value.currentTime = progress * sound.value.duration;
    }
};
const handleTouch = (event) => {
    const rect = fgCanvas.value.getBoundingClientRect();
    const x = event.touches[0].clientX;
    const y = event.touches[0].clientY;
    if(isInsideCanvas(x, y, rect)){
        resetFGCanvas();
        const progress = calculateProgress(x, rect);
        sound.value.currentTime = progress * sound.value.duration;
    }
};
onMounted(() => {
  if(fgCanvas.value && props.mode !== "rt"){
      fgCanvas.value.addEventListener('click', handleClick);
      fgCanvas.value.addEventListener('touchstart', handleTouch);
  }
  sound.value = props.audioPlayer;
  bgCtx = bgCanvas.value?.getContext('2d');
  fgCtx = fgCanvas.value?.getContext('2d');
  kokoroStore.channel.on('ChatBotWidget#audioResp', async (e) => {
    if(e.text !== props.audioKey && props.isAudioPlaying){
        await stopAudio();
    }
    if(e.text === props.audioKey){
        try{
            await playAudio();
        }catch(_){
            const ErrorStore = useErrorStore();
            ErrorStore.push("Error playing the audio of \"" + props.audioKey + "\"");
        }
    }
  });
});
onUnmounted(() => {
  if(animationFrameId){
    cancelAnimationFrame(animationFrameId);
  }
  kokoroStore.channel.off('ChatBotWidget#audioResp');
  if(fgCanvas.value && props.mode !== "rt"){
      fgCanvas.value.removeEventListener('click', handleClick);
      fgCanvas.value.removeEventListener('touchstart', handleTouch);
  }
});

</script>

<style scoped>
  .audio-player{
      background-color: rgb(37, 39, 41);
      color: lightgreen;
  }
  .audio-player-border{
    border: solid 1px lightgreen;
    border-radius: 10%;
  }
  .canvas-container{
      display: grid;
      position: relative;
      overflow-x: auto;
  }
  .bg-canvas{
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      opacity: 0.5;
  }
  .fg-canvas{
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
  }
  .inline{
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      width: auto;
      height: auto;
  }
  svg{
      filter: drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));
  }
  .svg-icon{
      display: inline-block;
      color: inherit;
      vertical-align: middle;
      fill: none;
      stroke: currentColor;
  }
  .svg-icon-fill{
      display: inline-block;
      color: inherit;
      vertical-align: middle;
      fill: currentColor;
      stroke: currentColor;
  }
  .safe-button{
      font-size: 1.25rem;
      border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
      margin: 0rem 0.5rem 0rem 0.5rem;
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
  .safe-button:disabled{
      opacity: 0.5;
      cursor: not-allowed !important;
  }
  .reg-btn{
      justify-content: flex-end;
      display: flex;
      flex-flow: row nowrap;
      font-size: 0.9rem;
      margin-top: 2px;
      margin-bottom: 2px;
  }
</style>


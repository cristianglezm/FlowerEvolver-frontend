<template>
  <div class="switch-panel-container">
    <div class="switch-panel-bar">
      <div class="switch-panel-left">
        {{ props.left }}
      </div>
      <div class="switch-panel-outer">
        <div class="switch-panel-inner" :class="{ 'switch-panel-ball-left': props.mode, 'switch-panel-ball-right': !props.mode }">
          <div class="switch-panel-ball" @click="onChange" />
        </div>
      </div>
      <div class="switch-panel-right">
        {{ props.right }}
      </div>
    </div>
    <transition name="fade" mode="out-in">
      <div v-if="props.mode">
        <slot name="left" />
      </div>
      <div v-else>
        <slot name="right" />
      </div>
    </transition>
  </div>
</template>

<script setup>
/**
 * @brief A Vue component that implements a switch panel with two states and associated content slots.
 * 
 * @prop {Boolean} mode - Determines the current state of the switch panel. 
 *                         `true` for the left state and `false` for the right state. Defaults to `true`.
 * @prop {String} left - The label displayed for the left state. Defaults to 'Left Placeholder'.
 * @prop {String} right - The label displayed for the right state. Defaults to 'Right Placeholder'.
 * 
 * @emits {on-change} - Emitted when the switch button is clicked, signaling a state change.
 * 
 * @example
 * <template>
 *   <SwitchPanel
 *     :mode="panelMode"
 *     left="On"
 *     right="Off"
 *     @on-change="handlePanelChange"
 *   >
 *     <template #left>
 *       <div>Left side content</div>
 *     </template>
 *     <template #right>
 *       <div>Right side content</div>
 *     </template>
 *   </SwitchPanel>
 * </template>
 * // code
 * 
 * const panelMode = ref(true);
 * const handlePanelChange = () => {
 *   /// more code to do something else when switch changes.
 *   panelMode.value = !panelMode.value;
 * };
 */
    const emit = defineEmits([
        'on-change'
    ]);
    const props = defineProps({
        mode:{
            type: Boolean,
            required: true,
            default: true
        },
        left:{
            type: String,
            required: true,
            default: 'Left Placeholder'
        },
        right:{
            type: String,
            required: true,
            default: 'Right Placeholder'
        }
    });
    const onChange = () => {
        emit('on-change');
    };
</script>

<style scoped>
.switch-panel-container{
    background-color: green;
    color: lightgreen;
    display: flex;
    flex-flow: column nowrap;
}
.switch-panel-bar{
    background-color: green;
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
}
.switch-panel-left{
    font-size: x-large;
    text-align: center;
}
.switch-panel-right{
    font-size: x-large;
    text-align: center;
}
.switch-panel-outer{
    background-color: green;
    width: 50%;
    height: 100%;
    margin: 0px 10px 0px 10px;
}
.switch-panel-inner{
    background-color: green;
    border: solid lightgreen;
    border-radius: 50px;
    width: 100%;
    height: 100%;
    display: flex;
    box-shadow: inset 1px 1px 15px 8px rgb(47, 38, 37);
    transition: justify-content 1.5s ease;
}
.switch-panel-ball{
    background-color: green;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    cursor: pointer;
    box-shadow: inset 1px 1px 15px 3px lightgreen;
    filter: drop-shadow(2px 2px 10px rgb(47, 38, 37));
}
.switch-panel-ball:hover{
  background-color: lightgreen;
  box-shadow: inset 1px 1px 15px 3px black;
  filter: drop-shadow(2px 2px 10px rgb(47, 38, 37));
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 1s ease 1.5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
@keyframes moveToLeft{ 
  0% {
    justify-content: flex-end;
  }
  50%{
    justify-content: center;
  }
  100% {
    justify-content: flex-start;
  }
}
@keyframes moveToRight{
  0% {
    justify-content: flex-start;
  }
  50%{
    justify-content: center;
  }
  100% {
    justify-content: flex-end;
  }
}
.switch-panel-ball-left{
  animation: moveToLeft 1.5s forwards;
}
.switch-panel-ball-right{
  animation: moveToRight 1.5s forwards;
}
</style>

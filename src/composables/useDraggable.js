import { ref, onMounted, onUnmounted } from 'vue';

export const useDraggable = () => {
    const isDragging = ref(false);
    const position = ref({ x: 0, y: 0 });
    const offset = ref({ x: 0, y: 0 });
  
    const setPosition = (pos) => { 
          position.value = { 
              x: pos.x,
              y: pos.y,
          };
    };
    const onMouseDown = (event) => {
      isDragging.value = true;
      offset.value = {
        x: event.clientX - position.value.x,
        y: event.clientY - position.value.y,
      };
    };
    const onMouseMove = (event) => {
      if (isDragging.value) {
        position.value = {
          x: event.clientX - offset.value.x,
          y: event.clientY - offset.value.y,
        };
      }
    };
    const onMouseUp = () => {
      isDragging.value = false;
    };
    const onTouchStart = (event) => {
      isDragging.value = true; 
      const touch = event.touches[0];
      offset.value = { 
        x: touch.clientX - position.value.x, 
        y: touch.clientY - position.value.y, 
      };
    };
    const onTouchMove = (event) => {
      if(isDragging.value){ 
        const touch = event.touches[0];
        position.value = { 
          x: touch.clientX - offset.value.x,
          y: touch.clientY - offset.value.y, 
        };
      }
    }; 
    const onTouchEnd = () => {
      isDragging.value = false;
    };
    onMounted(() => {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    });
    onUnmounted(() => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    });

    return { position, onMouseDown, onTouchStart, isDragging, setPosition };
  }
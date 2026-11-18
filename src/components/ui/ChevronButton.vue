<template>
  <button class="chevron-btn" type="button" aria-label="Flower menu" :aria-expanded="open">
    <svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" class="svg-icon-fill" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 299.283">
      <path :d="open ? OPEN : CLOSED" />
    </svg>
  </button>
</template>

<script setup>
/**
 * The chevron that opens and closes a menu. It does not open anything: it says `click` and the one that owns the menu
 * changes `open`, which turns the chevron over. It takes the colour of the text around it.
 *
 * It is a button: `data-testid`, `title` and the rest go to it. It says whether the menu is expanded.
 *
 * @component ChevronButton
 * @prop {Boolean} open - whether the menu that it opens is open.
 */
defineProps({
    open: {
        type: Boolean,
        default: false,
    },
});
const CLOSED = 'M75.334 286.691c-64.764 36.929-96.186-15.595-60.203-51.975L215.997 25.104c33.472-33.472 46.534-33.472 80.006 0l200.866 209.612c35.983 36.38 4.561 88.904-60.203 51.975L256 189.339 75.334 286.691z';
const OPEN = 'M75.334 12.591C10.57-24.337-20.852 28.186 15.131 64.566l200.866 209.613c33.472 33.471 46.534 33.471 80.006 0L496.869 64.566c35.983-36.38 4.561-88.903-60.203-51.975L256 109.944 75.334 12.591z';
</script>

<style scoped>
    .chevron-btn{
        position: relative;
        display: inline-block;
        padding: 0;
        border: none;
        background: none;
        color: inherit;
        font: inherit;
        cursor: pointer;
    }
    svg{
        filter: drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));
    }
    .svg-icon-fill{
        display: inline-block;
        color: inherit;
        vertical-align: middle;
        fill: currentColor;
        stroke: currentColor;
        margin-left: 2px;
    }
</style>

<template>
    <div v-if="errors.length" class="Modal">
        <span @click="clearErrors" class="close">&times;</span>
        <div class="modal-content" v-for="error of errors" :key="error.id">
            <p>{{error.message}}</p>
        </div>
        <button @click="clearErrors">Ok.</button>
    </div>
</template>

<script>
    export default {
        name:'Modal',
        props:{
           errors: Array, 
        },
        methods:{
            clearErrors: function(){
                this.$store.state.errors = [];
            },
        },
    }
</script>

<style scoped>
    .Modal{
        background-color: green;
        color: lightgreen;
        position: fixed;
        border: solid;
        border-color: lightgreen;
        border-radius: 5px;
        top: 40%;
        left: 40%;
        box-shadow: 0px 16px 32px 0px rgba(0,0,0,0.3);
        overflow: auto;
        z-index: 1;
    }
    .border{
        background-color: lightgreen;
    }
    p{
        font-size: 26px;
        overflow: auto;
    }
    .modal-content{
        margin: 15% auto;
        padding: 20px;
        width: 80%;
        overflow: auto;
    }
    .Modal button{
        background-color: green;
        color: lightgreen;
        border-color: lightgreen;
        position: relative;
        left:45%;
        margin-bottom: 10px;
    }
    .close{
        color: lightgreen;
        margin-right: 5px;
        float: right;
        font-size: 38px;
        font-weight: bold;
    }
    .close:hover,
    .close:focus{
        color: black;
        text-decoration: none;
        cursor: pointer;
    }
</style>

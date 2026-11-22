import { reactive } from 'vue';
import { keptPetals } from '../services/flowerEvolver';
import { useErrorStore } from '../stores/ErrorStore';

/**
 * The four fields of the params of a flower, as the forms that have them show them: what is the same in every one of
 * them (the key in the params, the end of the id of the input, the label, the tooltip). The bounds are for the spinner of
 * the input, they limit nothing: the wasm limits the params, and `keep` asks it what it kept.
 */
export const PETAL_FIELDS = Object.freeze([
    Object.freeze({ key: 'radius', id: 'radius', label: 'Radius: ', min: 4, max: 256, tooltip: 'radius of the flower, min: 4 and max: 256, for bigger radius use the desktop app.' }),
    Object.freeze({ key: 'numLayers', id: 'num-layers', label: 'Number of Layers: ', min: 1, tooltip: 'A layer is defined by radius / 2.0, the drawing algorithm will do another pass at half radius for each layer.' }),
    Object.freeze({ key: 'P', id: 'p', label: 'P: ', tooltip: 'It controls how many petals the flower will have.' }),
    Object.freeze({ key: 'bias', id: 'bias', label: 'Bias: ', tooltip: 'bias for the flower' }),
]);

export const CHECK_FAILED = "couldn't check the params with the wasm.";

const copyOf = (params) => ({ radius: params.radius, numLayers: params.numLayers, P: params.P, bias: params.bias });

// a number, as it is typed, or the value that the field is to have when it is left empty or is not a number
const numberOr = (fallback) => (value) => {
    if(value === '' || value === null || Number.isNaN(Number(value))){
        return fallback();
    }
    return value;
};

/**
 * @brief The params of the petals of a flower in a form: the values that are being edited, what a field does when it is
 * left with nothing, and what the wasm makes of them. It is the same for the creation params of the settings and for the
 * editor of the params of a flower.
 *
 * Nothing here limits a value: a radius of 1000 is a radius of 1000 until `keep` asks the wasm, and then it is what the
 * wasm kept.
 *
 * @param {Object} initial the params that the form starts with, and that `reset` goes back to.
 * @param {Object} fallback what a field that is left empty (or is not a number) takes: the params that it has, by name. It
 * is read when it is needed, so it can change. The ones that the form started with when it is not said.
 * @returns {{ params: Object, fields: Array, validate: Object, keep: Function, check: Function, reset: Function, snapshot: Function, isSameAs: Function }}
 * `params` is reactive, for `v-model`; `fields` has what the inputs show; `validate` has a function for each key, for the
 * `validate` of a NumberField; `keep()` asks the wasm and puts what it kept in `params`, and fails if the wasm does;
 * `check()` is `keep()` for a field that has just been left: it says that it could not (to the ErrorStore) instead of
 * failing, and gives `undefined` then; `reset(values)` goes back to
 * the params that it started with, or to the ones that it is given; `snapshot()` is a plain copy of the params;
 * `isSameAs(other)` says whether they are the same as the ones that it is given.
 *
 * @example
 * const { params, fields, validate, keep } = usePetalParams(SettingsStore.settings.params, DEFAULT_PARAMS);
 * // <NumberField v-for="field in fields" v-model="params[field.key]" :validate="validate[field.key]" ... />
 */
export const usePetalParams = (initial, fallback = copyOf(initial)) => {
    const start = copyOf(initial);
    const params = reactive(copyOf(initial));
    const validate = Object.fromEntries(PETAL_FIELDS.map(({ key }) => [key, numberOr(() => fallback[key])]));

    // The wasm answers a moment after it is asked, and a person can go on typing: a field that has changed since is not
    // given what was kept of what it had, it is going to be checked when it is left.
    const keep = async () => {
        const asked = copyOf(params);
        const kept = await keptPetals(asked);
        for(const { key } of PETAL_FIELDS){
            if(params[key] === asked[key]){
                params[key] = kept[key];
            }
        }
        return kept;
    };
    const check = async () => {
        try{
            return await keep();
        }catch(_){
            useErrorStore().push(CHECK_FAILED);
            return undefined;
        }
    };
    const reset = (values = start) => {
        Object.assign(params, copyOf(values));
    };
    const snapshot = () => copyOf(params);
    const isSameAs = (other) => PETAL_FIELDS.every(({ key }) => params[key] === other[key]);

    return { params, fields: PETAL_FIELDS, validate, keep, check, reset, snapshot, isSameAs };
};

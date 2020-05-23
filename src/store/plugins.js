import { STORAGE_KEY } from './mutations';

const localStoragePlugin = store => {
  store.subscribe((mutation, { favourites }) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
  })
}

export default [localStoragePlugin];
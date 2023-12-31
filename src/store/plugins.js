import { STORAGE_KEY } from './index';

const localStoragePlugin = store => {
  store.subscribe((mutation, { favourites }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
  })
}

export default [localStoragePlugin];

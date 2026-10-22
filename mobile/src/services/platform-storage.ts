import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

type WriteOptions = {
  nativeKeychainAccessible?: number
}

function getWebStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export const platformStorage = {
  async read(key: string) {
    if (Platform.OS === 'web') return getWebStorage()?.getItem(key) ?? null
    return SecureStore.getItemAsync(key)
  },

  async write(key: string, value: string, options: WriteOptions = {}) {
    if (Platform.OS === 'web') {
      getWebStorage()?.setItem(key, value)
      return
    }

    await SecureStore.setItemAsync(key, value, options.nativeKeychainAccessible === undefined
      ? undefined
      : { keychainAccessible: options.nativeKeychainAccessible })
  },

  async remove(key: string) {
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(key)
      return
    }

    await SecureStore.deleteItemAsync(key)
  },

  nativeWhenUnlockedThisDeviceOnly: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

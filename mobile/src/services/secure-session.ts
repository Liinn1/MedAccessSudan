import { platformStorage } from '@/services/platform-storage'

const TOKEN_KEY = 'medaccess_mobile_session_token'
const LEGACY_PATIENT_TOKEN_KEY = 'medaccess_patient_session_token'

async function readToken() {
  const token = await platformStorage.read(TOKEN_KEY)
  if (token) return token
  const legacyToken = await platformStorage.read(LEGACY_PATIENT_TOKEN_KEY)
  if (!legacyToken) return null
  await platformStorage.write(TOKEN_KEY, legacyToken, { nativeKeychainAccessible: platformStorage.nativeWhenUnlockedThisDeviceOnly })
  await platformStorage.remove(LEGACY_PATIENT_TOKEN_KEY)
  return legacyToken
}

export const secureSession = {
  read: readToken,
  write: (token: string) => platformStorage.write(TOKEN_KEY, token, {
    nativeKeychainAccessible: platformStorage.nativeWhenUnlockedThisDeviceOnly,
  }),
  clear: async () => {
    await platformStorage.remove(TOKEN_KEY)
    await platformStorage.remove(LEGACY_PATIENT_TOKEN_KEY)
  },
}

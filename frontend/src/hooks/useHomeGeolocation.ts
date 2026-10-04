import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { HomeCoordinates } from '../components/booking/PatientHomeAddressForm'

export function useHomeGeolocation() {
  const { t } = useTranslation()
  const [coordinates, setCoordinates] = useState<HomeCoordinates | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  function captureLocation() {
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError(t('patient.homeVisit.locationErrors.unavailable'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy })
        setLocating(false)
      },
      (cause) => {
        const key = cause.code === cause.PERMISSION_DENIED
          ? 'denied'
          : cause.code === cause.POSITION_UNAVAILABLE
            ? 'unavailable'
            : cause.code === cause.TIMEOUT
              ? 'timeout'
              : 'generic'
        setLocationError(t(`patient.homeVisit.locationErrors.${key}`))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return { captureLocation, coordinates, locating, locationError, setLocationError }
}

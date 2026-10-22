export type PatientHomeAddress = {
  contact_phone: string
  area: string
  address_details: string
  additional_directions: string
}

export type HomeCoordinates = {
  latitude: number
  longitude: number
  accuracy: number
}

export function createEmptyHomeAddress(contactPhone = ''): PatientHomeAddress {
  return { contact_phone: contactPhone, area: '', address_details: '', additional_directions: '' }
}

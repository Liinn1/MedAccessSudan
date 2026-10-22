export type UserRole = 'patient' | 'doctor' | 'laboratory' | 'admin' | 'super_admin'

export interface AuthenticatedUser {
  id: number
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  role: UserRole
  profile_image_url: string | null
}

export type AuthenticationStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated'

export type UserRole = "hospital" | "patient"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  hospitalId?: string // For hospital users
  patientId?: string // For patient users
}

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

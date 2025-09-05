import type { User } from "@/types/auth"

// Mock users for demonstration
export const mockUsers: User[] = [
  {
    id: "1",
    email: "hospital@example.com",
    name: "Dr. Sarah Johnson",
    role: "hospital",
    hospitalId: "hosp-001",
  },
  {
    id: "2",
    email: "patient@example.com",
    name: "John Smith",
    role: "patient",
    patientId: "pat-001",
  },
]

export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Simple mock authentication
  const user = mockUsers.find((u) => u.email === email)
  if (user && password === "password") {
    return user
  }
  return null
}

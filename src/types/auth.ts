export type User = {
  id: string;
  email: string;
  name: string;
  role: "hospital" | "patient";
};

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
};
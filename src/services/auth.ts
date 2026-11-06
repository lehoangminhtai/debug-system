import { login as apiLogin, setToken, useSession } from './api'

export { useSession }
export const login = apiLogin
export const logout = () => setToken('')

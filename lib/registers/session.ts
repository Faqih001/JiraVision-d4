// The fields the register routes read from a signed-in user. Kept structural so importing
// them does not pull the cookie and database modules into a unit test.

export type SessionUser = {
  id: number
  email: string
  role?: string | null
  timezone?: string | null
  preferences?: unknown
}

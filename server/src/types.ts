import type { Child, User } from './generated/prisma/client.js'

export type SessionMode = 'parent' | 'child'

export type AppEnv = {
  Variables: {
    user: User
    child: Child
    sessionMode: SessionMode
  }
}

import db from '../db.js'

export function sendEmail(userId: string, subject: string, content: string): void {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | { id: string; email: string; name: string }
    | undefined

  if (!user) return

  if (process.env.NODE_ENV === 'production') {
    console.log(`[Email] To: ${user.email}, Subject: ${subject}, Content: ${content}`)
  } else {
    console.log(`[Email Dev] To: ${user.email} (${user.name}), Subject: ${subject}`)
    console.log(`  Content: ${content}`)
  }
}

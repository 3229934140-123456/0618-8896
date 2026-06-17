import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import { JWT_SECRET } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req: Request, res: Response): void => {
  const { email, password, name, role } = req.body

  if (!email || !password || !name || !role) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  if (!['host', 'guest'].includes(role)) {
    res.status(400).json({ success: false, error: '角色必须是 host 或 guest' })
    return
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    res.status(409).json({ success: false, error: '该邮箱已注册' })
    return
  }

  const id = uuidv4()
  const hashedPassword = bcrypt.hashSync(password, 10)

  db.prepare(
    'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)'
  ).run(id, email, hashedPassword, name, role)

  const token = jwt.sign({ id, email, name, role }, JWT_SECRET, { expiresIn: '7d' })

  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id, email, name, role },
    },
  })
})

router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ success: false, error: '缺少邮箱或密码' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | { id: string; email: string; password: string; name: string; role: string; avatar: string }
    | undefined

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ success: false, error: '邮箱或密码错误' })
    return
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
    },
  })
})

export default router

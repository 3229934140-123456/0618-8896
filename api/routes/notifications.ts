import { Router, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user!.id)

  res.json({ success: true, data: notifications })
})

router.put('/:id/read', authMiddleware, (req: AuthRequest, res: Response): void => {
  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id) as
    | { id: string; user_id: string }
    | undefined

  if (!notification) {
    res.status(404).json({ success: false, error: '通知不存在' })
    return
  }

  if (notification.user_id !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权操作此通知' })
    return
  }

  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: '已标记为已读' })
})

router.put('/read-all', authMiddleware, (req: AuthRequest, res: Response): void => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user!.id)
  res.json({ success: true, message: '所有通知已标记为已读' })
})

export default router

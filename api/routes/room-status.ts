import { Router, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { booking_id, status, note } = req.body

  if (!booking_id || !status) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id) as
    | { id: string; host_id: string; guest_id: string; listing_id: string }
    | undefined

  if (!booking) {
    res.status(404).json({ success: false, error: '预订不存在' })
    return
  }

  if (req.user!.id !== booking.host_id && req.user!.id !== booking.guest_id) {
    res.status(403).json({ success: false, error: '无权报告此预订的房间状态' })
    return
  }

  const id = uuidv4()
  db.prepare(
    `INSERT INTO room_status (id, booking_id, status, note) VALUES (?, ?, ?, ?)`
  ).run(id, booking_id, status, note || '')

  if (status === 'needs_cleaning' || status === 'damaged' || status === 'maintenance_needed') {
    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
    ).run(
      uuidv4(), booking.host_id, 'room_status', '房间状态报告',
      `房间状态报告：${status}${note ? '，备注：' + note : ''}`
    )
  }

  const roomStatus = db.prepare('SELECT * FROM room_status WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: roomStatus })
})

router.get('/booking/:bookingId', authMiddleware, (req: AuthRequest, res: Response): void => {
  const statuses = db.prepare(
    'SELECT * FROM room_status WHERE booking_id = ? ORDER BY reported_at DESC'
  ).all(req.params.bookingId)

  res.json({ success: true, data: statuses })
})

export default router

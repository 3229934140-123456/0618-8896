import { Router, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  const booking_id = req.body.booking_id || req.body.bookingId
  const rating = req.body.rating
  const comment = req.body.comment
  const type = req.body.type

  if (!booking_id || !rating || !type) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  if (!['guest_to_listing', 'host_to_guest'].includes(type)) {
    res.status(400).json({ success: false, error: '评价类型必须是 guest_to_listing 或 host_to_guest' })
    return
  }

  if (rating < 1 || rating > 5) {
    res.status(400).json({ success: false, error: '评分必须在1-5之间' })
    return
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id) as
    | { id: string; guest_id: string; host_id: string; listing_id: string; status: string }
    | undefined

  if (!booking) {
    res.status(404).json({ success: false, error: '预订不存在' })
    return
  }

  if (type === 'guest_to_listing') {
    if (req.user!.id !== booking.guest_id) {
      res.status(403).json({ success: false, error: '仅房客可以评价房源' })
      return
    }
  } else {
    if (req.user!.id !== booking.host_id) {
      res.status(403).json({ success: false, error: '仅房东可以评价房客' })
      return
    }
  }

  const existing = db.prepare(
    'SELECT id FROM reviews WHERE booking_id = ? AND from_user_id = ? AND type = ?'
  ).get(booking_id, req.user!.id, type)

  if (existing) {
    res.status(409).json({ success: false, error: '您已经对此预订提交过该类型评价' })
    return
  }

  const id = uuidv4()
  const to_listing_id = type === 'guest_to_listing' ? booking.listing_id : null
  const to_guest_id = type === 'host_to_guest' ? booking.guest_id : null

  db.prepare(
    `INSERT INTO reviews (id, booking_id, from_user_id, to_listing_id, to_guest_id, rating, comment, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, booking_id, req.user!.id, to_listing_id, to_guest_id, rating, comment || '', type)

  if (type === 'guest_to_listing' && to_listing_id) {
    const stats = db.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE to_listing_id = ? AND type = ?'
    ).get(to_listing_id, 'guest_to_listing') as { avg_rating: number; count: number }

    db.prepare('UPDATE listings SET rating = ?, review_count = ? WHERE id = ?').run(
      Math.round(stats.avg_rating * 10) / 10,
      stats.count,
      to_listing_id
    )
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: review })
})

router.get('/listing/:listingId', (req: AuthRequest, res: Response): void => {
  const reviews = db.prepare(
    `SELECT r.*, u.name as from_user_name, u.avatar as from_user_avatar
     FROM reviews r JOIN users u ON r.from_user_id = u.id
     WHERE r.to_listing_id = ? AND r.type = 'guest_to_listing'
     ORDER BY r.created_at DESC`
  ).all(req.params.listingId)

  res.json({ success: true, data: reviews })
})

router.get('/host/:hostId', (req: AuthRequest, res: Response): void => {
  const listingIds = db.prepare('SELECT id FROM listings WHERE host_id = ?').all(req.params.hostId) as { id: string }[]

  if (listingIds.length === 0) {
    res.json({ success: true, data: [] })
    return
  }

  const ids = listingIds.map(l => l.id)
  const placeholders = ids.map(() => '?').join(',')

  const reviews = db.prepare(
    `SELECT r.*, u.name as from_user_name, u.avatar as from_user_avatar, l.title as listing_title
     FROM reviews r
     JOIN users u ON r.from_user_id = u.id
     JOIN listings l ON r.to_listing_id = l.id
     WHERE r.to_listing_id IN (${placeholders}) AND r.type = 'guest_to_listing'
     ORDER BY r.created_at DESC`
  ).all(...ids)

  res.json({ success: true, data: reviews })
})

export default router

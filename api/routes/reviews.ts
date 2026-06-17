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
    const allReviews = db.prepare(
      'SELECT rating FROM reviews WHERE to_listing_id = ? AND type = ?'
    ).all(to_listing_id, 'guest_to_listing') as { rating: number }[]
    const count = allReviews.length
    const avg = count > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / count : 0

    db.prepare('UPDATE listings SET rating = ?, review_count = ? WHERE id = ?').run(
      Math.round(avg * 10) / 10,
      count,
      to_listing_id
    )
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: review })
})

router.get('/listing/:listingId', (req: AuthRequest, res: Response): void => {
  const reviews = db.prepare(
    `SELECT * FROM reviews WHERE to_listing_id = ? AND type = 'guest_to_listing' ORDER BY created_at DESC`
  ).all(req.params.listingId) as Record<string, unknown>[]

  const result = reviews.map(r => {
    const user = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(r.from_user_id as string) as Record<string, unknown> | undefined
    return {
      ...r,
      from_user_name: user?.name as string | undefined,
      from_user_avatar: user?.avatar as string | undefined,
    }
  })

  res.json({ success: true, data: result })
})

router.get('/host/:hostId', (req: AuthRequest, res: Response): void => {
  const listingIds = db.prepare('SELECT id FROM listings WHERE host_id = ?').all(req.params.hostId) as { id: string }[]

  if (listingIds.length === 0) {
    res.json({ success: true, data: [] })
    return
  }

  const ids = listingIds.map(l => l.id)
  const allReviews: Record<string, unknown>[] = []
  for (const lid of ids) {
    const rs = db.prepare(
      `SELECT * FROM reviews WHERE to_listing_id = ? AND type = 'guest_to_listing' ORDER BY created_at DESC`
    ).all(lid) as Record<string, unknown>[]
    const listing = db.prepare('SELECT title FROM listings WHERE id = ?').get(lid) as { title: string } | undefined
    for (const r of rs) {
      const user = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(r.from_user_id as string) as Record<string, unknown> | undefined
      allReviews.push({
        ...r,
        from_user_name: user?.name as string | undefined,
        from_user_avatar: user?.avatar as string | undefined,
        listing_title: listing?.title,
      })
    }
  }

  allReviews.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  res.json({ success: true, data: allReviews })
})

router.get('/guest/:guestId', (req: AuthRequest, res: Response): void => {
  const guestId = req.params.guestId

  const fromReviews = db.prepare(
    `SELECT * FROM reviews WHERE from_user_id = ? ORDER BY created_at DESC`
  ).all(guestId) as Record<string, unknown>[]

  const toReviews = db.prepare(
    `SELECT * FROM reviews WHERE to_guest_id = ? ORDER BY created_at DESC`
  ).all(guestId) as Record<string, unknown>[]

  const allReviews: Record<string, unknown>[] = []

  for (const r of fromReviews) {
    const listing = r.to_listing_id
      ? (db.prepare('SELECT title FROM listings WHERE id = ?').get(r.to_listing_id as string) as { title: string } | undefined)
      : undefined
    const toGuest = r.to_guest_id
      ? (db.prepare('SELECT name FROM users WHERE id = ?').get(r.to_guest_id as string) as { name: string } | undefined)
      : undefined
    allReviews.push({
      ...r,
      listing_title: listing?.title,
      to_guest_name: toGuest?.name,
      direction: 'from_me',
    })
  }

  for (const r of toReviews) {
    const fromUser = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(r.from_user_id as string) as Record<string, unknown> | undefined
    allReviews.push({
      ...r,
      from_user_name: fromUser?.name,
      from_user_avatar: fromUser?.avatar,
      direction: 'to_me',
    })
  }

  allReviews.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  res.json({ success: true, data: allReviews })
})

export default router

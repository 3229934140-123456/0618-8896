import { Router, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { sendEmail } from '../services/email.js'

const router = Router()

router.post('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'guest') {
    res.status(403).json({ success: false, error: '仅房客可以创建预订' })
    return
  }

  const listing_id = req.body.listing_id || req.body.listingId
  const check_in = req.body.check_in || req.body.checkIn
  const check_out = req.body.check_out || req.body.checkOut
  const guests = req.body.guests

  if (!listing_id || !check_in || !check_out) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  if (check_in >= check_out) {
    res.status(400).json({ success: false, error: '退房日期必须晚于入住日期' })
    return
  }

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id) as
    | { id: string; host_id: string; title: string; base_price: number; max_guests: number }
    | undefined

  if (!listing) {
    res.status(404).json({ success: false, error: '房源不存在' })
    return
  }

  if (guests && guests > listing.max_guests) {
    res.status(400).json({ success: false, error: `超过最大入住人数（${listing.max_guests}人）` })
    return
  }

  const days = db.prepare(
    `SELECT * FROM calendar_days WHERE listing_id = ? AND date >= ? AND date < ? ORDER BY date`
  ).all(listing_id, check_in, check_out) as {
    id: string; listing_id: string; date: string; available: number; price: number; is_holiday: number
  }[]

  const checkInDate = new Date(check_in)
  const checkOutDate = new Date(check_out)
  const expectedCount = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

  if (days.length !== expectedCount) {
    res.status(400).json({ success: false, error: '所选日期范围内存在不可预订的日期' })
    return
  }

  const unavailableDays = days.filter(d => d.available !== 1)
  if (unavailableDays.length > 0) {
    res.status(400).json({
      success: false,
      error: `以下日期已被预订：${unavailableDays.map(d => d.date).join(', ')}`,
    })
    return
  }

  const totalPrice = days.reduce((sum, d) => sum + d.price, 0)

  const bookingTransaction = db.transaction(() => {
    const recheckDays = db.prepare(
      `SELECT * FROM calendar_days WHERE listing_id = ? AND date >= ? AND date < ? AND available = 1 ORDER BY date`
    ).all(listing_id, check_in, check_out)

    if (recheckDays.length !== expectedCount) {
      return null
    }

    for (const d of days) {
      db.prepare('UPDATE calendar_days SET available = 0 WHERE id = ?').run(d.id)
    }

    const bookingId = uuidv4()
    db.prepare(
      `INSERT INTO bookings (id, listing_id, guest_id, host_id, check_in, check_out, guests, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(bookingId, listing_id, req.user!.id, listing.host_id, check_in, check_out, guests || 1, totalPrice)

    return bookingId
  })

  const bookingId = bookingTransaction()

  if (!bookingId) {
    res.status(409).json({ success: false, error: '创建预订失败，日期可能已被其他用户预订' })
    return
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId)

  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
  ).run(
    uuidv4(), listing.host_id, 'booking', '新预订通知',
    `${req.user!.name} 预订了您的"${listing.title}"，入住${check_in}至${check_out}，请及时确认。`
  )

  sendEmail(
    listing.host_id,
    '新预订通知',
    `${req.user!.name} 预订了您的"${listing.title}"，入住${check_in}至${check_out}。`
  )

  res.status(201).json({ success: true, data: booking })
})

router.post('/:id/pay', authMiddleware, (req: AuthRequest, res: Response): void => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as
    | { id: string; guest_id: string; host_id: string; listing_id: string; status: string; check_in: string; check_out: string; total_price: number }
    | undefined

  if (!booking) {
    res.status(404).json({ success: false, error: '预订不存在' })
    return
  }

  if (booking.guest_id !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权支付此预订' })
    return
  }

  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    res.status(400).json({ success: false, error: '该预订状态不支持支付' })
    return
  }

  const confirmationCode = String(Math.floor(100000 + Math.random() * 900000))
  const doorPassword = String(Math.floor(1000 + Math.random() * 9000))

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(booking.listing_id) as
    | { title: string; address: string }
    | undefined

  const checkInInstructions = listing
    ? `入住${listing.title}（${listing.address}），确认码：${confirmationCode}，门锁密码：${doorPassword}。入住日期：${booking.check_in}，退房日期：${booking.check_out}。`
    : `确认码：${confirmationCode}，门锁密码：${doorPassword}`

  db.prepare(
    `UPDATE bookings SET status = 'paid', confirmation_code = ?, door_password = ?, check_in_instructions = ? WHERE id = ?`
  ).run(confirmationCode, doorPassword, checkInInstructions, booking.id)

  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
  ).run(
    uuidv4(), booking.host_id, 'payment', '预订已支付',
    `订单 ${booking.id.slice(0, 8)} 已完成支付，确认码：${confirmationCode}。`
  )

  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
  ).run(
    uuidv4(), booking.guest_id, 'payment', '支付成功',
    `您已成功支付${listing ? `"${listing.title}"` : ''}的预订，确认码：${confirmationCode}，门锁密码：${doorPassword}。`
  )

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id)
  res.json({ success: true, data: updated })
})

router.get('/guest', authMiddleware, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'guest') {
    res.status(403).json({ success: false, error: '仅房客可查看自己的预订' })
    return
  }

  const bookings = db.prepare(
    `SELECT * FROM bookings WHERE guest_id = ? ORDER BY created_at DESC`
  ).all(req.user!.id) as Record<string, unknown>[]

  const result = bookings.map(b => {
    const listing = db.prepare('SELECT title, city, images FROM listings WHERE id = ?').get(b.listing_id as string) as Record<string, unknown> | undefined
    return {
      ...b,
      listing_title: listing?.title as string | undefined,
      listing_city: listing?.city as string | undefined,
      listing_images: listing?.images as string | undefined,
    }
  })

  res.json({ success: true, data: result })
})

router.get('/host', authMiddleware, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'host') {
    res.status(403).json({ success: false, error: '仅房东可查看预订' })
    return
  }

  const bookings = db.prepare(
    `SELECT * FROM bookings WHERE host_id = ? ORDER BY created_at DESC`
  ).all(req.user!.id) as Record<string, unknown>[]

  const result = bookings.map(b => {
    const listing = db.prepare('SELECT title, city, images FROM listings WHERE id = ?').get(b.listing_id as string) as Record<string, unknown> | undefined
    const guest = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(b.guest_id as string) as Record<string, unknown> | undefined
    return {
      ...b,
      listing_title: listing?.title as string | undefined,
      listing_city: listing?.city as string | undefined,
      listing_images: listing?.images as string | undefined,
      guest_name: guest?.name as string | undefined,
      guest_avatar: guest?.avatar as string | undefined,
    }
  })

  res.json({ success: true, data: result })
})

router.put('/:id/status', authMiddleware, (req: AuthRequest, res: Response): void => {
  const { status } = req.body

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as
    | { id: string; guest_id: string; host_id: string; listing_id: string; status: string; check_in: string; check_out: string }
    | undefined

  if (!booking) {
    res.status(404).json({ success: false, error: '预订不存在' })
    return
  }

  const isHost = booking.host_id === req.user!.id
  const isGuest = booking.guest_id === req.user!.id
  if (!isHost && !isGuest) {
    res.status(403).json({ success: false, error: '无权操作此订单' })
    return
  }

  const hostOnlyActions = ['confirmed', 'checked_in', 'checked_out']
  const guestOnlyActions = ['paid']
  if (hostOnlyActions.includes(status) && !isHost) {
    res.status(403).json({ success: false, error: '仅房东可以执行此操作' })
    return
  }
  if (guestOnlyActions.includes(status) && !isGuest) {
    res.status(403).json({ success: false, error: '仅房客可以执行此操作' })
    return
  }

  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['paid', 'cancelled'],
    paid: ['checked_in', 'cancelled'],
    checked_in: ['checked_out'],
  }

  const allowed = validTransitions[booking.status] || []
  if (!allowed.includes(status)) {
    res.status(400).json({ success: false, error: `不能从"${booking.status}"变更为"${status}"` })
    return
  }

  const updateTransaction = db.transaction(() => {
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, booking.id)

    if (status === 'cancelled') {
      db.prepare(
        `UPDATE calendar_days SET available = 1 WHERE listing_id = ? AND date >= ? AND date < ?`
      ).run(booking.listing_id, booking.check_in, booking.check_out)
    }

    if (status === 'confirmed') {
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
      ).run(
        uuidv4(), booking.guest_id, 'booking', '预订已确认',
        `您的预订已被房东确认，请及时完成支付。`
      )
    }

    if (status === 'checked_in') {
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
      ).run(
        uuidv4(), booking.host_id, 'check_in', '房客已入住',
        `房客已办理入住。`
      )
    }

    if (status === 'checked_out') {
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
      ).run(
        uuidv4(), booking.guest_id, 'check_out', '退房成功',
        `您已成功退房，期待您的评价！`
      )
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
      ).run(
        uuidv4(), booking.host_id, 'check_out', '房客已退房',
        `房客已退房，请检查房间状态。`
      )
    }
  })

  updateTransaction()

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id)
  res.json({ success: true, data: updated })
})

router.get('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

  if (!booking) {
    res.status(404).json({ success: false, error: '预订不存在' })
    return
  }

  const listing = db.prepare('SELECT title, city, address, images, base_price FROM listings WHERE id = ?').get(booking.listing_id as string) as Record<string, unknown> | undefined
  const result = {
    ...booking,
    listing_title: listing?.title as string | undefined,
    listing_city: listing?.city as string | undefined,
    listing_address: listing?.address as string | undefined,
    listing_images: listing?.images as string | undefined,
    listing_base_price: listing?.base_price as number | undefined,
  }

  res.json({ success: true, data: result })
})

export default router

import { Router, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/host/mine', authMiddleware, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'host') {
    res.status(403).json({ success: false, error: '仅房东可查看自己的房源' })
    return
  }
  const listings = db.prepare('SELECT * FROM listings WHERE host_id = ?').all(req.user!.id)
  res.json({ success: true, data: listings })
})

router.get('/', (req: AuthRequest, res: Response): void => {
  const { city, checkIn, checkOut, guests, minPrice, maxPrice } = req.query

  let sql = `SELECT * FROM listings WHERE 1=1`
  const params: unknown[] = []

  if (city) {
    sql += ` AND city = ?`
    params.push(city)
  }
  if (guests) {
    sql += ` AND max_guests >= ?`
    params.push(Number(guests))
  }
  if (minPrice) {
    sql += ` AND base_price >= ?`
    params.push(Number(minPrice))
  }
  if (maxPrice) {
    sql += ` AND base_price <= ?`
    params.push(Number(maxPrice))
  }

  if (checkIn && checkOut) {
    const availableListingIds = new Set<string>()
    const allListings = db.prepare('SELECT id FROM listings').all() as { id: string }[]
    for (const l of allListings) {
      const days = db.prepare(
        'SELECT * FROM calendar_days WHERE listing_id = ? AND date >= ? AND date < ?'
      ).all(l.id, checkIn, checkOut) as { available: number }[]
      const allAvailable = days.length > 0 && days.every(d => d.available === 1)
      if (allAvailable) availableListingIds.add(l.id)
    }
    if (availableListingIds.size > 0) {
      const ids = [...availableListingIds]
      const placeholders = ids.map(() => '?').join(',')
      sql += ` AND id IN (${placeholders})`
      params.push(...ids)
    } else {
      sql += ` AND 1=0`
    }
  }

  const listings = db.prepare(sql).all(...params)

  res.json({ success: true, data: listings })
})

router.get('/:id', (req: AuthRequest, res: Response): void => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id)
  if (!listing) {
    res.status(404).json({ success: false, error: '房源不存在' })
    return
  }
  const host = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get((listing as Record<string, unknown>).host_id)
  const reviews = db.prepare(
    `SELECT r.*, u.name as from_user_name FROM reviews r JOIN users u ON r.from_user_id = u.id WHERE r.to_listing_id = ? AND r.type = 'guest_to_listing' ORDER BY r.created_at DESC`
  ).all(req.params.id)
  const calendarDays = db.prepare('SELECT * FROM calendar_days WHERE listing_id = ? ORDER BY date').all(req.params.id)
  res.json({ success: true, data: { ...listing, hostName: (host as Record<string, unknown>)?.name, reviews, calendarDays } })
})

router.post('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'host') {
    res.status(403).json({ success: false, error: '仅房东可以创建房源' })
    return
  }

  const {
    title, description, city, address, images, amenities, rules,
    max_guests, bedrooms, bathrooms, base_price,
  } = req.body

  if (!title || !city || !base_price) {
    res.status(400).json({ success: false, error: '缺少必填字段（标题、城市、基础价格）' })
    return
  }

  const id = uuidv4()
  db.prepare(
    `INSERT INTO listings (id, host_id, title, description, city, address, images, amenities, rules, max_guests, bedrooms, bathrooms, base_price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, req.user!.id, title, description || '', city, address || '',
    JSON.stringify(images || []), JSON.stringify(amenities || []), JSON.stringify(rules || []),
    max_guests || 1, bedrooms || 1, bathrooms || 1, base_price
  )

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: listing })
})

router.put('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id) as
    | { id: string; host_id: string }
    | undefined

  if (!listing) {
    res.status(404).json({ success: false, error: '房源不存在' })
    return
  }

  if (listing.host_id !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权修改此房源' })
    return
  }

  const fields: string[] = []
  const params: unknown[] = []

  const allowedFields = [
    'title', 'description', 'city', 'address', 'images', 'amenities',
    'rules', 'max_guests', 'bedrooms', 'bathrooms', 'base_price',
  ]

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      fields.push(`${field} = ?`)
      if (['images', 'amenities', 'rules'].includes(field)) {
        params.push(JSON.stringify(req.body[field]))
      } else {
        params.push(req.body[field])
      }
    }
  }

  if (fields.length === 0) {
    res.status(400).json({ success: false, error: '没有要更新的字段' })
    return
  }

  params.push(req.params.id)
  db.prepare(`UPDATE listings SET ${fields.join(', ')} WHERE id = ?`).run(...params)

  const updated = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id) as
    | { id: string; host_id: string }
    | undefined

  if (!listing) {
    res.status(404).json({ success: false, error: '房源不存在' })
    return
  }

  if (listing.host_id !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权删除此房源' })
    return
  }

  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: '房源已删除' })
})

router.get('/:id/calendar', (req: AuthRequest, res: Response): void => {
  const { startDate, endDate } = req.query
  let sql = 'SELECT * FROM calendar_days WHERE listing_id = ?'
  const params: unknown[] = [req.params.id]

  if (startDate) {
    sql += ' AND date >= ?'
    params.push(startDate)
  }
  if (endDate) {
    sql += ' AND date <= ?'
    params.push(endDate)
  }

  sql += ' ORDER BY date'
  const days = db.prepare(sql).all(...params)
  res.json({ success: true, data: days })
})

router.put('/:id/calendar/:date', authMiddleware, (req: AuthRequest, res: Response): void => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id) as
    | { id: string; host_id: string }
    | undefined

  if (!listing) {
    res.status(404).json({ success: false, error: '房源不存在' })
    return
  }

  if (listing.host_id !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权修改此房源日历' })
    return
  }

  const { available, price, is_holiday } = req.body
  const existing = db.prepare(
    'SELECT id FROM calendar_days WHERE listing_id = ? AND date = ?'
  ).get(req.params.id, req.params.date) as { id: string } | undefined

  if (existing) {
    const updates: string[] = []
    const params: unknown[] = []
    if (available !== undefined) { updates.push('available = ?'); params.push(available ? 1 : 0) }
    if (price !== undefined) { updates.push('price = ?'); params.push(price) }
    if (is_holiday !== undefined) { updates.push('is_holiday = ?'); params.push(is_holiday ? 1 : 0) }

    if (updates.length > 0) {
      params.push(req.params.id, req.params.date)
      db.prepare(`UPDATE calendar_days SET ${updates.join(', ')} WHERE listing_id = ? AND date = ?`).run(...params)
    }
  } else {
    db.prepare(
      `INSERT INTO calendar_days (id, listing_id, date, available, price, is_holiday) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      uuidv4(), req.params.id, req.params.date,
      available !== undefined ? (available ? 1 : 0) : 1,
      price || 0,
      is_holiday ? 1 : 0
    )
  }

  const day = db.prepare(
    'SELECT * FROM calendar_days WHERE listing_id = ? AND date = ?'
  ).get(req.params.id, req.params.date)

  res.json({ success: true, data: day })
})

export default router

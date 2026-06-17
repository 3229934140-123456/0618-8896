import cron from 'node-cron'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

export function startScheduler(): void {
  cron.schedule('0 9 * * *', () => {
    console.log('[Scheduler] 检查明天入住的预订...')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)

    const bookings = db.prepare(
      `SELECT b.*, l.title as listing_title, u.name as guest_name, u.email as guest_email
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON b.guest_id = u.id
       WHERE b.check_in = ? AND b.status IN ('paid', 'confirmed')`
    ).all(tomorrowStr) as {
      id: string; guest_id: string; host_id: string; listing_title: string; guest_name: string; guest_email: string; check_in: string; check_out: string; door_password: string; confirmation_code: string
    }[]

    for (const booking of bookings) {
      const existing = db.prepare(
        `SELECT id FROM notifications WHERE user_id = ? AND type = ? AND message LIKE ? AND date(created_at) = date('now')`
      ).get(booking.guest_id, 'check_in_reminder', `%${booking.id}%`)

      if (existing) continue

      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`
      ).run(
        uuidv4(),
        booking.guest_id,
        'check_in_reminder',
        '入住提醒',
        `您明天即将入住"${booking.listing_title}"，入住日期：${booking.check_in}，退房日期：${booking.check_out}。${booking.door_password ? '门锁密码：' + booking.door_password : '请提前联系房东获取入住指引。'}`
      )

      console.log(`[Scheduler] 已为 ${booking.guest_name} 创建入住提醒 (${booking.listing_title})`)
    }
  })

  console.log('[Scheduler] 定时任务已启动（每天9:00检查次日入住提醒）')
}

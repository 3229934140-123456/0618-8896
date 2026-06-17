import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDb, seedDb } from './db.js'
import { startScheduler } from './services/scheduler.js'
import authRoutes from './routes/auth.js'
import listingsRoutes from './routes/listings.js'
import bookingsRoutes from './routes/bookings.js'
import reviewsRoutes from './routes/reviews.js'
import notificationsRoutes from './routes/notifications.js'
import roomStatusRoutes from './routes/room-status.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/listings', listingsRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/reviews', reviewsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/room-status', roomStatusRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

initDb()
seedDb()
startScheduler()

export default app

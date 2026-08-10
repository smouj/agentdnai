import { createServer } from 'http'
import { Server } from 'socket.io'

const NEXT_API_BASE = 'http://localhost:3000'
const PORT = 3003
const AGENTDNAI_SESSION_TOKEN = process.env.AGENTDNAI_SESSION_TOKEN

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track known event IDs to detect new ones
let knownEventIds: Set<string> = new Set()

interface AuditEvent {
  id: string
  eventType?: string
  action?: string | null
  decision?: string | null
  createdAt?: string
}

/**
 * Fetch last N audit events from the Next.js API
 */
async function fetchAuditEvents(limit = 20): Promise<AuditEvent[]> {
  try {
    const res = await fetch(`${NEXT_API_BASE}/api/audit?limit=${limit}`, {
      headers: AGENTDNAI_SESSION_TOKEN
        ? { Authorization: `Bearer ${AGENTDNAI_SESSION_TOKEN}` }
        : undefined,
    })
    if (!res.ok) {
      console.error(`Failed to fetch audit events: ${res.status}`)
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data : data.events || []
  } catch (err) {
    console.error('Error fetching audit events:', err)
    return []
  }
}

/**
 * Fetch stats from the Next.js API
 */
async function fetchStats(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${NEXT_API_BASE}/api/stats`, {
      headers: AGENTDNAI_SESSION_TOKEN
        ? { Authorization: `Bearer ${AGENTDNAI_SESSION_TOKEN}` }
        : undefined,
    })
    if (!res.ok) {
      console.error(`Failed to fetch stats: ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('Error fetching stats:', err)
    return null
  }
}

// --- WebSocket connection handling ---

io.on('connection', async (socket) => {
  console.warn(`Client connected: ${socket.id} (total: ${io.sockets.sockets.size})`)

  // Emit connection count to all clients
  io.emit('connection-count', io.sockets.sockets.size)

  // Send last 20 audit events as initial data
  try {
    const events = await fetchAuditEvents(20)
    socket.emit('initial-events', events)

    // Initialize known event IDs from initial data
    if (events.length > 0 && knownEventIds.size === 0) {
      for (const event of events) {
        if (event.id) {
          knownEventIds.add(event.id)
        }
      }
    }
  } catch (err) {
    console.error('Error sending initial events:', err)
  }

  socket.on('disconnect', () => {
    console.warn(`Client disconnected: ${socket.id} (total: ${io.sockets.sockets.size})`)
    io.emit('connection-count', io.sockets.sockets.size)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

// --- Polling for new audit events every 3 seconds ---

setInterval(async () => {
  try {
    const events = await fetchAuditEvents(20)
    if (events.length === 0) return

    // Find new events (events not in our known set)
    const newEvents = events.filter((event) => event.id && !knownEventIds.has(event.id))

    if (newEvents.length > 0) {
      console.warn(`Detected ${newEvents.length} new security event(s)`)

      // Emit each new event individually as a security-event
      for (const event of newEvents) {
        io.emit('security-event', event)
      }

      // Update known IDs - keep the set bounded to avoid memory growth
      // Refresh from the latest 20 events
      const newKnownIds = new Set<string>()
      for (const event of events) {
        if (event.id) {
          newKnownIds.add(event.id)
        }
      }
      // Also keep any previously known IDs that might still be relevant
      for (const id of knownEventIds) {
        newKnownIds.add(id)
      }
      // Limit the set size to prevent unbounded growth
      if (newKnownIds.size > 200) {
        knownEventIds = new Set(Array.from(newKnownIds).slice(-200))
      } else {
        knownEventIds = newKnownIds
      }
    }
  } catch (err) {
    console.error('Error polling audit events:', err)
  }
}, 3000)

// --- Polling for stats every 5 seconds ---

setInterval(async () => {
  try {
    const stats = await fetchStats()
    if (stats) {
      io.emit('stats-update', stats)
    }
  } catch (err) {
    console.error('Error polling stats:', err)
  }
}, 5000)

// --- Start server ---

httpServer.listen(PORT, () => {
  console.warn(`Event WebSocket service running on port ${PORT}`)
  console.warn(`Polling audit events from ${NEXT_API_BASE}/api/audit every 3s`)
  console.warn(`Polling stats from ${NEXT_API_BASE}/api/stats every 5s`)
})

// --- Graceful shutdown ---

process.on('SIGTERM', () => {
  console.warn('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.warn('Event WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.warn('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.warn('Event WebSocket server closed')
    process.exit(0)
  })
})

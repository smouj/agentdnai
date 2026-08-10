import { db } from '@/lib/db'
import { ApiError } from '@/lib/api-error'
import { requireAuth, visibleAuditWhere } from '@/lib/ownership'

/**
 * GET /api/events/stream - SSE endpoint for real-time security event notifications
 * Falls back to polling audit events every 5 seconds for clients not using WebSocket
 */
export async function GET(request: Request) {
  let auditWhere: Awaited<ReturnType<typeof visibleAuditWhere>>

  try {
    const session = await requireAuth(request)
    auditWhere = await visibleAuditWhere(session.userId)
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse()
    }
    return new Response('Unauthorized', { status: 401 })
  }

  let knownEventIds: Set<string> = new Set()
  let intervalId: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          // Stream may have been closed
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
        }
      }

      // Send initial comment to establish connection
      try {
        controller.enqueue(encoder.encode(': connected\n\n'))
      } catch {
        return
      }

      // Send initial audit events
      try {
        const initialEvents = await db.auditEvent.findMany({
          where: auditWhere,
          orderBy: { createdAt: 'desc' },
          take: 20,
        })

        for (const event of initialEvents) {
          if (event.id) {
            knownEventIds.add(event.id)
          }
        }

        sendEvent('initial', initialEvents)
      } catch (error) {
        console.error('Error fetching initial events for SSE:', error)
        sendEvent('error', { message: 'Failed to fetch initial events' })
      }

      // Poll for new events every 5 seconds
      intervalId = setInterval(async () => {
        try {
          const events = await db.auditEvent.findMany({
            where: auditWhere,
            orderBy: { createdAt: 'desc' },
            take: 20,
          })

          // Find new events
          const newEvents = events.filter(
            (event) => event.id && !knownEventIds.has(event.id)
          )

          if (newEvents.length > 0) {
            // Emit each new event
            for (const event of newEvents) {
              sendEvent('security-event', event)
            }

            // Update known IDs
            for (const event of events) {
              if (event.id) {
                knownEventIds.add(event.id)
              }
            }

            // Keep the set bounded
            if (knownEventIds.size > 200) {
              const idsArray = Array.from(knownEventIds)
              knownEventIds = new Set(idsArray.slice(-200))
            }
          }
        } catch (error) {
          console.error('Error polling audit events for SSE:', error)
          sendEvent('error', { message: 'Failed to poll events' })
        }
      }, 5000)
    },

    cancel() {
      // Client disconnected
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type NotificationItem = {
  createdAt: string
  id: string | number
  isRead: boolean
  message: string
  title: string
  type: string
}

export function StudentNotificationsFeed({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[]
}) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [isPending, startTransition] = useTransition()

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkAsRead = (id: string | number) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    )

    startTransition(async () => {
      try {
        await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' })
        router.refresh()
      } catch {
        // Fallback
      }
    })
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))

    startTransition(async () => {
      try {
        await fetch('/api/v1/notifications', { method: 'POST' })
        router.refresh()
      } catch {
        // Fallback
      }
    })
  }

  if (!notifications.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dce4de] bg-[#f8faf8] p-6 text-center text-sm text-[#748279]">
        No notifications yet. You will receive updates when you book tickets or when waitlist seats are allocated.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#16844b]">
            Activity & Alerts
          </span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#16844b] px-2 py-0.5 text-[10px] font-black text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="text-xs font-bold text-[#16844b] transition hover:underline disabled:opacity-50"
            disabled={isPending}
            onClick={handleMarkAllAsRead}
            type="button"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="divide-y divide-[#eef2ee] rounded-2xl border border-[#dce4de] bg-white">
        {notifications.map((n) => {
          const date = new Intl.DateTimeFormat('en', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(n.createdAt))

          return (
            <div
              className={`flex items-start justify-between gap-4 p-4 transition ${
                n.isRead ? 'bg-white opacity-85' : 'bg-[#f4faf5]'
              }`}
              key={n.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!n.isRead && (
                    <span className="size-2 rounded-full bg-[#16844b]" title="Unread" />
                  )}
                  <p className="text-sm font-extrabold text-[#112a1f]">{n.title}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#55635b]">{n.message}</p>
                <span className="mt-2 block text-[10px] font-semibold text-[#8a9890]">
                  {date}
                </span>
              </div>
              {!n.isRead && (
                <button
                  aria-label="Mark notification as read"
                  className="shrink-0 rounded-lg border border-[#c8d6cb] px-2.5 py-1 text-[11px] font-bold text-[#16844b] transition hover:bg-[#edf5ee]"
                  disabled={isPending}
                  onClick={() => handleMarkAsRead(n.id)}
                  type="button"
                >
                  Mark read
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

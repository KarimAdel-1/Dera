'use client'

import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { markAsRead, markAllAsRead, removeNotification, clearAllNotifications } from '../store/notificationSlice'

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount } = useSelector((state) => state.notifications)
  const dispatch = useDispatch()

  const handleMarkAsRead = (id) => {
    dispatch(markAsRead(id))
  }

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead())
  }

  const handleRemoveNotification = (id) => {
    dispatch(removeNotification(id))
  }

  const handleClearAll = () => {
    dispatch(clearAllNotifications())
    setIsOpen(false)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      case 'critical': return '🚨'
      case 'info': return 'ℹ️'
      default: return '🔔'
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'border-green-500/20 bg-green-500/10'
      case 'warning': return 'border-yellow-500/20 bg-yellow-500/10'
      case 'error': return 'border-red-500/20 bg-red-500/10'
      case 'critical': return 'border-red-500/40 bg-red-500/20 animate-pulse'
      case 'info': return 'border-blue-500/20 bg-blue-500/10'
      default: return 'border-[var(--color-border-secondary)] bg-[var(--color-bg-secondary)]'
    }
  }

  const formatTime = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7h6m0 0V3m0 4l4-4M9 7L5 3m4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2m0 0V3a2 2 0 012-2h2a2 2 0 012 2v2" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border-secondary)]">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[var(--color-text-primary)]">
                Notifications
              </h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-muted)]">
                No notifications
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'bg-opacity-20' : 'bg-opacity-10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <h4 className={`text-sm font-medium ${
                            !notification.read ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                          }`}>
                            {notification.title}
                          </h4>
                        </div>
                        <p className={`text-xs mt-1 ${
                          !notification.read ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {formatTime(notification.timestamp)}
                          </span>
                          <div className="flex space-x-1">
                            {!notification.read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-[var(--color-primary)] hover:underline"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveNotification(notification.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
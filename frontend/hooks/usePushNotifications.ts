'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // SW registration failure is non-fatal
    })
  }, [isAuthenticated])
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export function showLocalNotification(title: string, body: string, url = '/dashboard') {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
    } as NotificationOptions)
  }).catch(() => {
    // Fallback: browser notification
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192.png' })
    }
  })
}

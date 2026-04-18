'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

const VAPID_PUBLIC_KEY = 'BFIRUkQqhHzcc0Cfjszlu0O0aP3XCeMUTrCtqy8Lu6B22MxOSCXub9uv4-ct3HdwROskT-4nTMSz3FRcQKvwR8c'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buf
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [isAuthenticated])
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'denied') return false

  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return false
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      const json = existing.toJSON()
      await api.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys }).catch(() => {})
      return true
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const json = subscription.toJSON()
    await api.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
    return true
  } catch {
    return false
  }
}

export async function unsubscribePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await api.delete('/push/unsubscribe', { data: { endpoint: sub.endpoint } }).catch(() => {})
      await sub.unsubscribe()
    }
  } catch {
    // Non-critical
  }
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
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192.png' })
    }
  })
}

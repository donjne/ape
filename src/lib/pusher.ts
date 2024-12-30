// lib/pusher.ts
import PusherClient from 'pusher-js'
import PusherServer from 'pusher'

// Enable Pusher client debugging
PusherClient.logToConsole = process.env.NODE_ENV !== 'production'

// Server-side Pusher instance
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

// Client-side Pusher instance
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    forceTLS: true
  }
)

// Enhanced debug logging
if (process.env.NODE_ENV !== 'production') {
  pusherClient.connection.bind('state_change', (states: any) => {
    console.log('Pusher connection status:', states)
  })

  pusherClient.connection.bind('connected', () => {
    console.log('Connected to Pusher')
    console.log('Subscribing to channel: tokens-channel')
  })

  pusherClient.connection.bind('error', (err: any) => {
    console.error('Pusher connection error:', err)
  })

  // Add subscription debugging
  const channel = pusherClient.subscribe('tokens-channel')
  
  channel.bind('subscription_succeeded', () => {
    console.log('Successfully subscribed to tokens-channel')
  })

  channel.bind('subscription_error', (err: any) => {
    console.error('Subscription error:', err)
  })
}
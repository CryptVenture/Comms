/**
 * Type declarations for node-pushnotifications
 * This library doesn't provide its own TypeScript definitions
 */

declare module 'node-pushnotifications' {
  export interface Data {
    [key: string]: unknown
  }

  export interface PushSettings {
    gcm?: {
      id?: string
      phonegap?: boolean
    }
    apn?: {
      token?: {
        key: string
        keyId: string
        teamId: string
      }
      cert?: string
      key?: string
      ca?: string
      pfx?: string
      passphrase?: string
      production?: boolean
      voip?: boolean
      address?: string
      port?: number
      rejectUnauthorized?: boolean
      connectionRetryLimit?: number
      cacheLength?: number
      connectionTimeout?: number
      autoAdjustCache?: boolean
      maxConnections?: number
      minConnections?: number
      connectTimeout?: number
      buffersNotifications?: boolean
      fastMode?: boolean
      disableNagle?: boolean
      disableEPIPEFix?: boolean
    }
    adm?: {
      client_id: string
      client_secret: string
    }
    wns?: {
      client_id: string
      client_secret: string
      accessToken?: string
      headers?: Record<string, string>
      notificationMethod?: string
    }
    web?: {
      vapidDetails?: {
        subject: string
        publicKey: string
        privateKey: string
      }
      gcmAPIKey?: string
      TTL?: number
      headers?: Record<string, string | number | boolean>
      contentEncoding?: string
      urgency?: string
    }
    isAlwaysUseFCM?: boolean
  }

  export interface RegistrationId {
    id: string
    type?: string
  }

  export interface Notification {
    title?: string
    topic?: string
    body?: string
    custom?: Data
    priority?: string
    collapseKey?: string
    contentAvailable?: boolean | number
    delayWhileIdle?: boolean
    restrictedPackageName?: string
    dryRun?: boolean
    icon?: string
    tag?: string
    color?: string
    clickAction?: string
    bodyLocKey?: string
    bodyLocArgs?: string
    titleLocKey?: string
    titleLocArgs?: string
    badge?: number | string
    sound?: string
    alert?:
      | string
      | {
          title?: string
          body?: string
          'title-loc-key'?: string
          'title-loc-args'?: string[]
          'action-loc-key'?: string
          'loc-key'?: string
          'loc-args'?: string[]
          'launch-image'?: string
        }
    vibrate?: number
    lights?: number
    category?: string
    threadId?: string
    mutableContent?: boolean | number
    pushType?: string
    expiry?: number
    // Additional properties
    [key: string]: unknown
  }

  export interface Result {
    method: string
    success: number
    failure: number
    message: Array<{
      regId: string
      error?: Error | null
      errorMsg?: string
    }>
  }

  export default class PushNotifications {
    constructor(settings: PushSettings)
    send(
      registrationIds: string | string[] | RegistrationId | RegistrationId[],
      data: Notification,
      callback?: (err: Error | null, result: Result | Result[]) => void
    ): Promise<Result | Result[]>
  }
}

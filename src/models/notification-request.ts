/**
 * Core notification request types for the comcentre notification system.
 *
 * This module defines the fundamental request types for all supported notification channels:
 * - Email
 * - Push (mobile push notifications)
 * - SMS
 * - Voice
 * - Webpush (browser push notifications)
 * - Slack
 * - WhatsApp
 *
 * All request types extend RequestMetadata which provides common fields for
 * tracking and identifying notification requests.
 *
 * @module notification-request
 */

/**
 * Base metadata available on all notification request types.
 * Used for tracking and identifying notification requests across the system.
 */
export interface RequestMetadata {
  /**
   * Optional unique identifier for this notification request.
   * Can be used for idempotency and tracking.
   */
  id?: string

  /**
   * Optional user identifier associated with this notification.
   * Useful for analytics and user-specific notification preferences.
   */
  userId?: string
}

/**
 * Email notification request.
 *
 * Supports rich email features including HTML content, attachments,
 * CC/BCC recipients, and custom headers.
 *
 * @example
 * ```typescript
 * const emailRequest: EmailRequest = {
 *   from: 'noreply@example.com',
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to our service</h1>',
 *   text: 'Welcome to our service'
 * };
 * ```
 */
export interface EmailRequest extends RequestMetadata {
  /** Sender email address (RFC 5322 format) */
  from: string

  /** Recipient email address (RFC 5322 format) */
  to: string

  /** Email subject line */
  subject: string

  /** Optional CC (carbon copy) recipients */
  cc?: string[]

  /** Optional BCC (blind carbon copy) recipients */
  bcc?: string[]

  /** Optional Reply-To email address */
  replyTo?: string

  /** Plain text version of the email body */
  text?: string

  /** HTML version of the email body */
  html?: string

  /**
   * Optional email attachments.
   * Each attachment must specify content type, filename, and content.
   */
  attachments?: Array<{
    /** MIME content type (e.g., 'text/plain', 'image/png', 'application/pdf') */
    contentType: string

    /** Filename to display for this attachment */
    filename: string

    /** File content as string or Buffer */
    content: string | Buffer
  }>

  /**
   * Optional custom email headers.
   * Key-value pairs for additional SMTP headers.
   */
  headers?: Record<string, string | number | boolean>

  /**
   * Optional customization function for provider-specific modifications.
   * Allows dynamic customization of the email request before sending.
   *
   * @param providerId - The ID of the email provider being used
   * @param request - The email request to customize
   * @returns Promise resolving to the customized email request
   */
  customize?: (providerId: string, request: EmailRequest) => Promise<EmailRequest>
}

/**
 * Mobile push notification request.
 *
 * Supports both iOS (APNs) and Android (FCM/GCM) push notifications
 * with platform-specific options.
 *
 * @example
 * ```typescript
 * const pushRequest: PushRequest = {
 *   registrationToken: 'device-token-here',
 *   title: 'New Message',
 *   body: 'You have a new message from John',
 *   badge: 1,
 *   sound: 'default'
 * };
 * ```
 */
export interface PushRequest extends RequestMetadata {
  /** Device registration token (FCM token or APNs device token) */
  registrationToken: string

  /** Notification title */
  title: string

  /** Notification body text */
  body: string

  /** Optional custom data payload (platform-specific) */
  custom?: Record<string, unknown>

  /**
   * Notification priority (affects delivery timing and device behavior).
   * - 'high': Delivered immediately (default)
   * - 'normal': May be delayed for battery optimization
   *
   * For APNs, translates to priority 10 (high) or 5 (normal)
   */
  priority?: 'high' | 'normal'

  /** Collapse key for message grouping (FCM for Android, collapseId for APNs) */
  collapseKey?: string

  /** Enable content-available flag for background updates (FCM for Android) */
  contentAvailable?: boolean

  /** Delay delivery when device is idle (FCM for Android) */
  delayWhileIdle?: boolean

  /** Restrict delivery to specific package name (FCM for Android) */
  restrictedPackageName?: string

  /** Dry run mode for testing without actual delivery (FCM for Android) */
  dryRun?: boolean

  /** Notification icon resource name (FCM for Android) */
  icon?: string

  /** Notification tag for grouping/replacing (FCM for Android) */
  tag?: string

  /** Notification color in #rrggbb format (FCM for Android) */
  color?: string

  /** Activity to launch on notification click (FCM for Android, category for iOS) */
  clickAction?: string

  /** Localization key for notification body (FCM, APNs) */
  locKey?: string

  /** Localization arguments for body (FCM, APNs) */
  bodyLocArgs?: string

  /** Localization key for notification title (FCM, APNs) */
  titleLocKey?: string

  /** Localization arguments for title (FCM, APNs) */
  titleLocArgs?: string

  /** Number of retry attempts for failed deliveries (FCM, APNs) */
  retries?: number

  /** Character encoding for notification payload (APNs) */
  encoding?: string

  /** Badge count to display on app icon (FCM for iOS, APNs) */
  badge?: number

  /** Sound file name to play (FCM, APNs) */
  sound?: string

  /**
   * Custom alert configuration (APNs).
   * Takes precedence over title and body if provided.
   */
  alert?: string | Record<string, unknown>

  /** Launch image filename (APNs and FCM for iOS) */
  launchImage?: string

  /** Action identifier for notification action (APNs and FCM for iOS) */
  action?: string

  /** APNs topic (bundle ID) for routing (APNs and FCM for iOS) */
  topic?: string

  /** Category identifier for notification actions (APNs and FCM for iOS) */
  category?: string

  /** MDM payload (APNs and FCM for iOS) */
  mdm?: string

  /** URL arguments for Safari notifications (APNs and FCM for iOS) */
  urlArgs?: string

  /** Truncate notification text at word boundaries (APNs and FCM for iOS) */
  truncateAtWordEnd?: boolean

  /** Enable mutable content for notification service extensions (APNs) */
  mutableContent?: number

  /** Expiration timestamp in seconds since epoch (takes precedence over timeToLive) */
  expiry?: number

  /** Time to live in seconds (expiry takes precedence if both are set) */
  timeToLive?: number

  /** Custom HTTP headers for WNS (Windows Notification Service) */
  headers?: Record<string, string | number | boolean>

  /** Launch arguments for tile/toast notifications (WNS) */
  launch?: string

  /** Toast notification duration: 'short' or 'long' (WNS) */
  duration?: string

  /** Consolidation key for message grouping (ADM - Amazon Device Messaging) */
  consolidationKey?: string

  /**
   * Optional customization function for provider-specific modifications.
   *
   * @param providerId - The ID of the push provider being used
   * @param request - The push request to customize
   * @returns Promise resolving to the customized push request
   */
  customize?: (providerId: string, request: PushRequest) => Promise<PushRequest>
}

/**
 * SMS (text message) notification request.
 *
 * @example
 * ```typescript
 * const smsRequest: SmsRequest = {
 *   from: '+1234567890',
 *   to: '+0987654321',
 *   text: 'Your verification code is: 123456',
 *   type: 'text'
 * };
 * ```
 */
export interface SmsRequest extends RequestMetadata {
  /** Sender phone number or sender ID */
  from: string

  /** Recipient phone number (E.164 format recommended) */
  to: string

  /** Message text content */
  text: string

  /**
   * Message encoding type.
   * - 'text': Standard GSM 7-bit encoding (default)
   * - 'unicode': UTF-16 encoding for international characters
   */
  type?: 'text' | 'unicode'

  /**
   * Message nature for compliance and routing.
   * - 'marketing': Promotional messages
   * - 'transactional': Service-related messages
   */
  nature?: 'marketing' | 'transactional'

  /** Time to live in seconds (message expiration) */
  ttl?: number

  /**
   * Message class for special handling.
   * - 0: Flash SMS (displayed immediately, not stored)
   * - 1: ME-specific (mobile equipment)
   * - 2: SIM/USIM specific
   * - 3: TE-specific (terminal equipment)
   */
  messageClass?: 0 | 1 | 2 | 3

  /**
   * Optional customization function for provider-specific modifications.
   *
   * @param providerId - The ID of the SMS provider being used
   * @param request - The SMS request to customize
   * @returns Promise resolving to the customized SMS request
   */
  customize?: (providerId: string, request: SmsRequest) => Promise<SmsRequest>
}

/**
 * Voice call notification request.
 *
 * Initiates an automated voice call with programmable content.
 *
 * @example
 * ```typescript
 * const voiceRequest: VoiceRequest = {
 *   from: '+1234567890',
 *   to: '+0987654321',
 *   url: 'https://example.com/voice-script.xml',
 *   method: 'GET'
 * };
 * ```
 */
export interface VoiceRequest extends RequestMetadata {
  /** Caller ID (phone number to display to recipient) */
  from: string

  /** Recipient phone number (E.164 format recommended) */
  to: string

  /** URL to fetch voice call instructions (TwiML or equivalent) */
  url: string

  /** HTTP method for fetching voice instructions (default: 'POST') */
  method?: string

  /** Fallback URL if primary URL fails */
  fallbackUrl?: string

  /** HTTP method for fallback URL */
  fallbackMethod?: string

  /** Callback URL for call status updates */
  statusCallback?: string

  /** Array of call events to trigger status callbacks */
  statusCallbackEvent?: string[]

  /** DTMF tones to send after connection */
  sendDigits?: string

  /** Enable answering machine detection ('Enable' or 'Disable') */
  machineDetection?: string

  /** Timeout in seconds for machine detection */
  machineDetectionTimeout?: number

  /** Maximum call duration in seconds */
  timeout?: number

  /**
   * Optional customization function for provider-specific modifications.
   *
   * @param providerId - The ID of the voice provider being used
   * @param request - The voice request to customize
   * @returns Promise resolving to the customized voice request
   */
  customize?: (providerId: string, request: VoiceRequest) => Promise<VoiceRequest>
}

/**
 * Web Push notification request (browser push notifications).
 *
 * Follows the W3C Push API standard for browser push notifications.
 * Browser support noted in comments (C=Chrome, F=Firefox, S=Safari).
 *
 * @example
 * ```typescript
 * const webpushRequest: WebpushRequest = {
 *   subscription: {
 *     endpoint: 'https://fcm.googleapis.com/fcm/send/...',
 *     keys: {
 *       auth: 'base64-auth-key',
 *       p256dh: 'base64-p256dh-key'
 *     }
 *   },
 *   title: 'New Message',
 *   body: 'You have a new message',
 *   icon: '/icon.png'
 * };
 * ```
 */
export interface WebpushRequest extends RequestMetadata {
  /**
   * Push subscription object from the browser's Push API.
   * Obtained via ServiceWorkerRegistration.pushManager.subscribe()
   */
  subscription: {
    /** Push service endpoint URL */
    endpoint: string

    /** Encryption keys for message security */
    keys: {
      /** Authentication secret (base64 encoded) */
      auth: string

      /** P256DH public key (base64 encoded) */
      p256dh: string
    }
  }

  /** Notification title (Chrome 22+, Firefox 22+, Safari 6+) */
  title: string

  /** Notification body text (Chrome 22+, Firefox 22+, Safari 6+) */
  body: string

  /**
   * Action buttons for the notification (Chrome 53+).
   * Each action has an identifier, title, and optional icon.
   */
  actions?: Array<{
    /** Action identifier (passed to service worker on click) */
    action: string

    /** Button text to display */
    title: string

    /** Optional icon URL for the button */
    icon?: string
  }>

  /** Badge icon URL for monochrome notification icon (Chrome 53+) */
  badge?: string

  /**
   * Text direction for the notification.
   * - 'auto': Automatically determined from content
   * - 'ltr': Left-to-right
   * - 'rtl': Right-to-left
   *
   * Supported: Chrome 22+, Firefox 22+, Safari 6+
   */
  dir?: 'auto' | 'rtl' | 'ltr'

  /** Notification icon URL (Chrome 22+, Firefox 22+) */
  icon?: string

  /** Large image URL to display in notification (Chrome 55+, Firefox 22+) */
  image?: string

  /** Custom URL redirects (primarily for local testing) */
  redirects?: Record<string, string>

  /** Keep notification visible until user interacts (Chrome 22+, Firefox 52+) */
  requireInteraction?: boolean

  /**
   * Optional customization function for provider-specific modifications.
   *
   * @param providerId - The ID of the webpush provider being used
   * @param request - The webpush request to customize
   * @returns Promise resolving to the customized webpush request
   */
  customize?: (providerId: string, request: WebpushRequest) => Promise<WebpushRequest>
}

/**
 * Slack notification request.
 *
 * Sends messages to Slack channels via incoming webhooks with support
 * for rich formatting, attachments, and interactive elements.
 *
 * @example
 * ```typescript
 * const slackRequest: SlackRequest = {
 *   text: 'Deployment completed successfully',
 *   attachments: [{
 *     color: 'good',
 *     title: 'Production Deploy',
 *     text: 'Version 2.0.1 is now live'
 *   }]
 * };
 * ```
 */
export interface SlackRequest extends RequestMetadata {
  /**
   * Slack webhook URL.
   * Required if not configured at the provider level.
   */
  webhookUrl?: string

  /** Main message text (supports Slack markdown) */
  text: string

  /** Automatically unfurl links in the message */
  unfurl_links?: boolean

  /**
   * Rich message attachments.
   * Attachments provide additional formatting and interactive elements.
   */
  attachments?: Array<{
    /** Plain text fallback for notifications */
    fallback?: string

    /** Color bar (hex color or 'good', 'warning', 'danger') */
    color?: string

    /** Text before the attachment block */
    pretext?: string

    /** Author name */
    author_name?: string

    /** Author profile URL */
    author_link?: string

    /** Author icon URL */
    author_icon?: string

    /** Attachment title */
    title?: string

    /** URL to make title a hyperlink */
    title_link?: string

    /** Main attachment text (supports Slack markdown) */
    text?: string

    /**
     * Structured fields for key-value data.
     */
    fields?: Array<{
      /** Field label */
      title?: string

      /** Field value */
      value?: string

      /** Display field in short format (side-by-side) */
      short?: boolean
    }>

    /**
     * Interactive action buttons.
     */
    actions?: Array<{
      /** Button type */
      type: 'button'

      /** Button label */
      text: string

      /** Target URL when clicked */
      url: string

      /** Button style ('primary' for green, 'danger' for red) */
      style?: 'primary' | 'danger'
    }>

    /** Large image URL */
    image_url?: string

    /** Thumbnail image URL */
    thumb_url?: string

    /** Footer text */
    footer?: string

    /** Footer icon URL */
    footer_icon?: string

    /** Timestamp (Unix epoch time in seconds) */
    ts?: number
  }>

  /**
   * Optional customization function for provider-specific modifications.
   *
   * @param providerId - The ID of the Slack provider being used
   * @param request - The Slack request to customize
   * @returns Promise resolving to the customized Slack request
   */
  customize?: (providerId: string, request: SlackRequest) => Promise<SlackRequest>
}

/**
 * WhatsApp notification request.
 *
 * Supports various message types including templates, text, and media.
 *
 * @example
 * ```typescript
 * const whatsappRequest: WhatsappRequest = {
 *   from: '1234567890',
 *   to: '0987654321',
 *   type: 'text',
 *   text: 'Hello from WhatsApp!'
 * };
 * ```
 */
export interface WhatsappRequest extends RequestMetadata {
  /** Sender WhatsApp Business number */
  from: string

  /** Recipient WhatsApp number */
  to: string

  /**
   * Message type.
   * - 'template': Pre-approved message template
   * - 'text': Simple text message
   * - 'document': Document file
   * - 'image': Image file
   * - 'audio': Audio file
   * - 'video': Video file
   * - 'sticker': Sticker file
   */
  type: 'template' | 'text' | 'document' | 'image' | 'audio' | 'video' | 'sticker'

  /** Message text (for 'text' type) */
  text?: string

  /** Media URL (for media types: document, image, audio, video, sticker) */
  mediaUrl?: string

  /** Template name (for 'template' type) */
  templateName?: string

  /** Template variable data (for 'template' type) */
  templateData?: Record<string, unknown>

  /** Optional message ID for tracking */
  messageId?: string

  /**
   * Optional customization function for provider-specific modifications.
   *
   * @param providerId - The ID of the WhatsApp provider being used
   * @param request - The WhatsApp request to customize
   * @returns Promise resolving to the customized WhatsApp request
   */
  customize?: (providerId: string, request: WhatsappRequest) => Promise<WhatsappRequest>
}

/**
 * Union type of all individual channel request types.
 *
 * Use this when handling a single channel request in isolation.
 */
export type ChannelRequest =
  | EmailRequest
  | PushRequest
  | SmsRequest
  | VoiceRequest
  | WebpushRequest
  | SlackRequest
  | WhatsappRequest

/**
 * Notification request object for sending across multiple channels.
 *
 * Contains optional metadata and channel-specific request data.
 * Each channel key contains the request data for that notification channel.
 *
 * @example
 * ```typescript
 * const request: NotificationRequest = {
 *   id: 'notification-123',
 *   userId: 'user-456',
 *   email: {
 *     from: 'noreply@example.com',
 *     to: 'user@example.com',
 *     subject: 'Hello',
 *     text: 'Welcome!'
 *   },
 *   sms: {
 *     from: '+1234567890',
 *     to: '+0987654321',
 *     text: 'Welcome!'
 *   }
 * }
 * ```
 */
/**
 * Omit metadata fields from a request type and make remaining fields partial
 * for runtime validation flexibility
 */
type ChannelData<T> = Partial<Omit<T, 'id' | 'userId'>>

export interface NotificationRequest extends RequestMetadata {
  /** Email notification request data */
  email?: ChannelData<EmailRequest>

  /** Mobile push notification request data */
  push?: ChannelData<PushRequest>

  /** SMS notification request data */
  sms?: ChannelData<SmsRequest>

  /** Voice call notification request data */
  voice?: ChannelData<VoiceRequest>

  /** Web push notification request data */
  webpush?: ChannelData<WebpushRequest>

  /** Slack notification request data */
  slack?: ChannelData<SlackRequest>

  /** WhatsApp notification request data */
  whatsapp?: ChannelData<WhatsappRequest>

  /**
   * Additional custom channel data.
   * Used for custom channels defined in the SDK configuration.
   */
  [key: string]: unknown
}

// Type aliases for backward compatibility
/** @deprecated Use EmailRequest instead */
export type EmailRequestType = EmailRequest
/** @deprecated Use PushRequest instead */
export type PushRequestType = PushRequest
/** @deprecated Use SmsRequest instead */
export type SmsRequestType = SmsRequest
/** @deprecated Use VoiceRequest instead */
export type VoiceRequestType = VoiceRequest
/** @deprecated Use WebpushRequest instead */
export type WebpushRequestType = WebpushRequest
/** @deprecated Use SlackRequest instead */
export type SlackRequestType = SlackRequest
/** @deprecated Use WhatsappRequest instead */
export type WhatsappRequestType = WhatsappRequest
/** @deprecated Use NotificationRequest instead */
export type RequestType = NotificationRequest
/** @deprecated Use ChannelRequest instead */
export type SingleChannelRequest = ChannelRequest

import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'
import mockHttp, { mockResponse } from '../mockHttp.test'

vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

const sdk = new CommsSdk({
  channels: {
    email: {
      providers: [
        {
          type: 'postmark',
          serverToken: 'test-server-token',
        },
      ],
    },
  },
})

const request = {
  email: {
    from: 'me@example.com',
    to: 'john@example.com',
    subject: 'Hi John',
    text: 'Hello John! How are you?',
  },
}

test('Postmark success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ MessageID: 'returned-id', ErrorCode: 0, Message: 'OK' }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.postmarkapp.com',
      method: 'POST',
      path: '/email',
      protocol: 'https:',
      href: 'https://api.postmarkapp.com/email',
      headers: expect.objectContaining({
        Accept: ['application/json'],
        'Content-Type': ['application/json'],
        'X-Postmark-Server-Token': ['test-server-token'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  const body = JSON.parse((mockHttp as any).body)
  expect(body).toEqual(
    expect.objectContaining({
      From: 'me@example.com',
      To: 'john@example.com',
      Subject: 'Hi John',
      TextBody: 'Hello John! How are you?',
      Metadata: expect.objectContaining({
        id: expect.any(String),
      }),
    })
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: 'returned-id', providerId: 'email-postmark-provider' },
    },
  })
})

test('Postmark success with all parameters.', async () => {
  mockResponse(200, JSON.stringify({ MessageID: 'returned-id', ErrorCode: 0, Message: 'OK' }))
  const completeRequest = {
    id: '24',
    userId: '36',
    email: {
      from: 'from@example.com',
      to: 'to@example.com',
      subject: 'Hi John',
      html: '<b>Hello John! How are you?</b>',
      replyTo: 'replyto@example.com',
      headers: { 'My-Custom-Header': 'my-value' },
      cc: ['cc1@example.com', 'cc2@example.com'],
      bcc: ['bcc@example.com'],
      attachments: [
        {
          contentType: 'text/plain',
          filename: 'test.txt',
          content: 'hello!',
        },
      ],
      customize: async (provider: string, request: any) => ({ ...request, subject: 'Hi John!' }),
    },
  }
  const result = await sdk.send(completeRequest)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.postmarkapp.com',
      method: 'POST',
      path: '/email',
      protocol: 'https:',
      href: 'https://api.postmarkapp.com/email',
      headers: expect.objectContaining({
        Accept: ['application/json'],
        'Content-Type': ['application/json'],
        'X-Postmark-Server-Token': ['test-server-token'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  const body = JSON.parse((mockHttp as any).body)
  expect(body).toEqual({
    From: 'from@example.com',
    To: 'to@example.com',
    Cc: 'cc1@example.com,cc2@example.com',
    Bcc: 'bcc@example.com',
    Subject: 'Hi John!',
    HtmlBody: '<b>Hello John! How are you?</b>',
    ReplyTo: 'replyto@example.com',
    Headers: [{ Name: 'My-Custom-Header', Value: 'my-value' }],
    Attachments: [
      {
        Name: 'test.txt',
        Content: Buffer.from('hello!').toString('base64'),
        ContentType: 'text/plain',
      },
    ],
    Metadata: {
      id: '24',
      userId: '36',
    },
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: 'returned-id', providerId: 'email-postmark-provider' },
    },
  })
})

test('Postmark success with buffered attachment.', async () => {
  mockResponse(200, JSON.stringify({ MessageID: 'returned-id', ErrorCode: 0, Message: 'OK' }))
  const completeRequest = {
    id: '24',
    email: {
      from: 'from@example.com',
      to: 'to@example.com',
      subject: 'Hi John',
      html: '<b>Hello John! How are you?</b>',
      attachments: [
        {
          contentType: 'text/plain',
          filename: 'test.txt',
          content: Buffer.from('hello!'),
        },
      ],
    },
  }
  const result = await sdk.send(completeRequest)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.postmarkapp.com',
      method: 'POST',
      path: '/email',
      protocol: 'https:',
      href: 'https://api.postmarkapp.com/email',
      headers: expect.objectContaining({
        Accept: ['application/json'],
        'Content-Type': ['application/json'],
        'X-Postmark-Server-Token': ['test-server-token'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  const body = JSON.parse((mockHttp as any).body)
  expect(body).toEqual({
    From: 'from@example.com',
    To: 'to@example.com',
    Subject: 'Hi John',
    HtmlBody: '<b>Hello John! How are you?</b>',
    Attachments: [
      {
        Name: 'test.txt',
        Content: Buffer.from('hello!').toString('base64'),
        ContentType: 'text/plain',
      },
    ],
    Metadata: {
      id: '24',
    },
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: 'returned-id', providerId: 'email-postmark-provider' },
    },
  })
})

test('Postmark API error.', async () => {
  mockResponse(400, JSON.stringify({ ErrorCode: 300, Message: 'Invalid email address' }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      email: 'Postmark API error: Invalid email address (code: 300)',
    },
    channels: {
      email: { id: undefined, providerId: 'email-postmark-provider' },
    },
  })
})

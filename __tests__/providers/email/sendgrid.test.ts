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
          type: 'sendgrid',
          apiKey: 'key',
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

test('Sendgrid success with minimal parameters.', async () => {
  mockResponse(200, '')
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.sendgrid.com',
      method: 'POST',
      path: '/v3/mail/send',
      protocol: 'https:',
      href: 'https://api.sendgrid.com/v3/mail/send',
      headers: expect.objectContaining({
        Authorization: ['Bearer key'],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toContain(
    '{"personalizations":[{"to":[{"email":"john@example.com"}]}],"from":{"email":"me@example.com"},"subject":"Hi John","content":[{"type":"text/plain","value":"Hello John! How are you?"}],"custom_args":{"id":"'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: expect.stringMatching(/\w*/), providerId: 'email-sendgrid-provider' },
    },
  })
})

test('Sendgrid success with all parameters.', async () => {
  mockResponse(200, '')
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
      hostname: 'api.sendgrid.com',
      method: 'POST',
      path: '/v3/mail/send',
      protocol: 'https:',
      href: 'https://api.sendgrid.com/v3/mail/send',
      headers: expect.objectContaining({
        Authorization: ['Bearer key'],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"personalizations":[{"to":[{"email":"to@example.com"}],"cc":[{"email":"cc1@example.com"},{"email":"cc2@example.com"}],"bcc":[{"email":"bcc@example.com"}]}],"from":{"email":"from@example.com"},"reply_to":{"email":"replyto@example.com"},"subject":"Hi John!","content":[{"type":"text/html","value":"<b>Hello John! How are you?</b>"}],"headers":{"My-Custom-Header":"my-value"},"custom_args":{"id":"24","userId":"36"},"attachments":[{"type":"text/plain","filename":"test.txt","content":"aGVsbG8h"}]}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: '24', providerId: 'email-sendgrid-provider' },
    },
  })
})

test('Sendgrid success with buffered attachment.', async () => {
  mockResponse(200, '')
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
      hostname: 'api.sendgrid.com',
      method: 'POST',
      path: '/v3/mail/send',
      protocol: 'https:',
      href: 'https://api.sendgrid.com/v3/mail/send',
      headers: expect.objectContaining({
        Authorization: ['Bearer key'],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"personalizations":[{"to":[{"email":"to@example.com"}]}],"from":{"email":"from@example.com"},"subject":"Hi John","content":[{"type":"text/html","value":"<b>Hello John! How are you?</b>"}],"custom_args":{"id":"24"},"attachments":[{"type":"text/plain","filename":"test.txt","content":"aGVsbG8h"}]}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: '24', providerId: 'email-sendgrid-provider' },
    },
  })
})

test('Sendgrid API error.', async () => {
  mockResponse(400, JSON.stringify({ errors: [{ code: '24', message: 'error!' }] }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      email: 'SendGrid API error: code: 24, message: error!',
    },
    channels: {
      email: { id: undefined, providerId: 'email-sendgrid-provider' },
    },
  })
})

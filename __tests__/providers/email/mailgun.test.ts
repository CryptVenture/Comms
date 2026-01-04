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
          type: 'mailgun',
          apiKey: 'key',
          domainName: 'example.com',
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

test('Mailgun success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ id: 'returned-id' }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.mailgun.net',
      method: 'POST',
      path: '/v3/example.com/messages',
      protocol: 'https:',
      href: 'https://api.mailgun.net/v3/example.com/messages',
      headers: expect.objectContaining({
        Accept: ['*/*'],
        Authorization: ['Basic YXBpOmtleQ=='],
        'Content-Type': [expect.stringContaining('multipart/form-data; boundary=')],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: 'returned-id', providerId: 'email-mailgun-provider' },
    },
  })
})

test('Mailgun success with all parameters.', async () => {
  mockResponse(200, JSON.stringify({ id: 'returned-id' }))
  const completeRequest = {
    metadata: {
      id: '24',
      userId: '36',
    },
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
      hostname: 'api.mailgun.net',
      method: 'POST',
      path: '/v3/example.com/messages',
      protocol: 'https:',
      href: 'https://api.mailgun.net/v3/example.com/messages',
      headers: expect.objectContaining({
        Accept: ['*/*'],
        Authorization: ['Basic YXBpOmtleQ=='],
        'Content-Type': [expect.stringContaining('multipart/form-data; boundary=')],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: 'returned-id', providerId: 'email-mailgun-provider' },
    },
  })
})

test('Mailgun API error.', async () => {
  mockResponse(400, JSON.stringify({ message: 'error!' }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      email: 'Mailgun API error: error!',
    },
    channels: {
      email: { id: undefined, providerId: 'email-mailgun-provider' },
    },
  })
})

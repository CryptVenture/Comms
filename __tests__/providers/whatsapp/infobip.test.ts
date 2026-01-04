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
    whatsapp: {
      providers: [
        {
          type: 'infobip',
          baseUrl: 'https://xxxxxx.api.infobip.com',
          apiKey: 'xxx',
        },
      ],
    },
  },
})

const request = {
  whatsapp: {
    from: 'me',
    to: 'you',
    type: 'text' as const,
    text: 'Hello John! How are you?',
  },
}

test('Infobip text message success.', async () => {
  mockResponse(
    200,
    JSON.stringify({
      to: 'you',
      messageCount: 1,
      messageId: '...',
      status: {
        groupId: 1,
        groupName: 'PENDING',
        id: 1,
        name: 'PENDING_ENROUTE',
        description: 'Message sent to next instance',
      },
    })
  )
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      method: 'POST',
      href: 'https://xxxxxx.api.infobip.com/whatsapp/1/message/text',
    })
  )
  expect((mockHttp as any).body).toContain('{"text":"Hello John! How are you?"}')
  expect(result).toEqual({
    status: 'success',
    channels: {
      whatsapp: { id: '...', providerId: 'whatsapp-infobip-provider' },
    },
  })
})

test('Infobip text template success.', async () => {
  mockResponse(
    200,
    JSON.stringify({
      messages: [
        {
          to: 'you',
          messageCount: 1,
          messageId: '...',
          status: {
            groupId: 1,
            groupName: 'PENDING',
            id: 1,
            name: 'PENDING_ENROUTE',
            description: 'Message sent to next instance',
          },
        },
      ],
    })
  )
  const result = await sdk.send({
    whatsapp: {
      from: 'me',
      to: 'you',
      type: 'template',
      templateName: 'template-name',
      templateData: { body: { placeholders: ['John'] } },
    } as any,
  })
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      method: 'POST',
      href: 'https://xxxxxx.api.infobip.com/whatsapp/1/message/template',
    })
  )
  expect((mockHttp as any).body).toContain(
    '[{"from":"me","to":"you","content":{"templateName":"template-name","templateData":{"body":{"placeholders":["John"]}}}}]'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      whatsapp: { id: '...', providerId: 'whatsapp-infobip-provider' },
    },
  })
})

test('Infobip customized success.', async () => {
  mockResponse(
    200,
    JSON.stringify({
      to: 'you',
      messageCount: 1,
      messageId: '...',
      status: {
        groupId: 1,
        groupName: 'PENDING',
        id: 1,
        name: 'PENDING_ENROUTE',
        description: 'Message sent to next instance',
      },
    })
  )
  await sdk.send({
    whatsapp: {
      from: 'me',
      to: 'you',
      type: 'text',
      text: '',
      customize: async (_provider: string, _request: any) => ({
        from: 'me',
        to: 'you',
        type: 'text',
        text: 'Hello John! How are you?',
      }),
    } as any,
  })
  expect((mockHttp as any).body).toContain('{"text":"Hello John! How are you?"}')
})

test('Infobip with error (no text).', async () => {
  mockResponse(
    400,
    JSON.stringify({
      requestError: {
        serviceException: {
          messageId: 'BAD_REQUEST',
          text: 'Bad request',
        },
      },
    })
  )
  const result = await sdk.send({
    whatsapp: { from: '1', to: '2', type: 'text', text: 'hi' } as any,
  })
  expect(result).toEqual({
    status: 'error',
    errors: {
      whatsapp: 'messageId: BAD_REQUEST, text: Bad request',
    },
    channels: {
      whatsapp: { id: undefined, providerId: 'whatsapp-infobip-provider' },
    },
  })
})

test('Infobip with unknown error.', async () => {
  mockResponse(500, JSON.stringify({ error: 'KO' }))
  const result = await sdk.send({
    whatsapp: { from: '1', to: '2', type: 'text', text: 'hi' } as any,
  })
  expect(result).toEqual({
    status: 'error',
    errors: {
      whatsapp: 'Infobip API error: {"error":"KO"}',
    },
    channels: {
      whatsapp: { id: undefined, providerId: 'whatsapp-infobip-provider' },
    },
  })
})

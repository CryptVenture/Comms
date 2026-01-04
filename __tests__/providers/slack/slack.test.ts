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
    slack: {
      providers: [
        {
          type: 'webhook',
          webhookUrl:
            'https://hooks.slack.com/services/Txxxxxxxx/Bxxxxxxxx/xxxxxxxxxxxxxxxxxxxxxxxx',
        },
      ],
    },
  },
})

const request = {
  slack: {
    text: 'Hello John! How are you?',
  },
}

test('Slack success.', async () => {
  mockResponse(200, 'ok')
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      method: 'POST',
      href: 'https://hooks.slack.com/services/Txxxxxxxx/Bxxxxxxxx/xxxxxxxxxxxxxxxxxxxxxxxx',
    })
  )
  expect((mockHttp as any).body).toContain('{"text":"Hello John! How are you?"}')
  expect(result).toEqual({
    status: 'success',
    channels: {
      slack: { id: '', providerId: 'slack-provider' },
    },
  })
})

test('Slack customized success.', async () => {
  mockResponse(200, 'ok')
  await sdk.send({
    slack: {
      text: '',
      customize: async (_provider: string, _request: any) => ({
        text: 'Hello John! How are you?',
      }),
    },
  })
  expect((mockHttp as any).body).toContain('{"text":"Hello John! How are you?"}')
})

test('Slack with no message.', async () => {
  mockResponse(500, 'missing_text_or_fallback_or_attachments')
  const result = await sdk.send({ slack: { text: [] as any } })
  expect(result).toEqual({
    status: 'error',
    errors: {
      slack: 'Slack webhook error: missing_text_or_fallback_or_attachments',
    },
    channels: {
      slack: { id: undefined, providerId: 'slack-provider' },
    },
  })
})

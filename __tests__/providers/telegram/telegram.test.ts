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
    telegram: {
      providers: [
        {
          type: 'telegram-bot',
          botToken: '123456789:ABCdefGHIjklMNOpqrstUVWxyz',
          chatId: '-1001234567890',
        },
      ],
    },
  },
})

const request = {
  telegram: {
    chatId: '-1001234567890',
    text: 'Hello John! How are you?',
  },
}

test('Telegram success.', async () => {
  mockResponse(
    200,
    JSON.stringify({
      ok: true,
      result: {
        message_id: 123,
        chat: { id: -1001234567890 },
        date: 1234567890,
        text: 'Hello John! How are you?',
      },
    })
  )
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      method: 'POST',
      href: 'https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrstUVWxyz/sendMessage',
    })
  )
  expect((mockHttp as any).body).toContain(
    '{"chat_id":"-1001234567890","text":"Hello John! How are you?"}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      telegram: { id: '123', providerId: 'telegram-bot-provider' },
    },
  })
})

test('Telegram customized success.', async () => {
  mockResponse(
    200,
    JSON.stringify({
      ok: true,
      result: {
        message_id: 456,
        chat: { id: -1001234567890 },
        date: 1234567890,
        text: 'Hello John! How are you?',
      },
    })
  )
  await sdk.send({
    telegram: {
      chatId: '-1001234567890',
      text: '',
      customize: async (_provider: string, _request: any) => ({
        chatId: '-1001234567890',
        text: 'Hello John! How are you?',
      }),
    },
  })
  expect((mockHttp as any).body).toContain(
    '{"chat_id":"-1001234567890","text":"Hello John! How are you?"}'
  )
})

test('Telegram with parseMode and optional parameters.', async () => {
  mockResponse(
    200,
    JSON.stringify({
      ok: true,
      result: {
        message_id: 789,
        chat: { id: -1001234567890 },
        date: 1234567890,
        text: '<b>Bold</b> text',
      },
    })
  )
  await sdk.send({
    telegram: {
      chatId: '-1001234567890',
      text: '<b>Bold</b> text',
      parseMode: 'HTML',
      disableNotification: true,
      replyToMessageId: 42,
    },
  })
  expect((mockHttp as any).body).toContain('"parse_mode":"HTML"')
  expect((mockHttp as any).body).toContain('"disable_notification":true')
  expect((mockHttp as any).body).toContain('"reply_to_message_id":42')
})

test('Telegram with no text.', async () => {
  const result = await sdk.send({ telegram: { chatId: '-1001234567890', text: '' } })
  expect(result).toEqual({
    status: 'error',
    errors: {
      telegram: 'Telegram request must include text',
    },
    channels: {
      telegram: { id: undefined, providerId: 'telegram-bot-provider' },
    },
  })
})

test('Telegram with no chatId and no default.', async () => {
  const sdkNoChatId = new CommsSdk({
    channels: {
      telegram: {
        providers: [
          {
            type: 'telegram-bot',
            botToken: '123456789:ABCdefGHIjklMNOpqrstUVWxyz',
          },
        ],
      },
    },
  })

  const result = await sdkNoChatId.send({ telegram: { text: 'Hello!' } as any })
  expect(result).toEqual({
    status: 'error',
    errors: {
      telegram: 'Telegram request must include chatId',
    },
    channels: {
      telegram: { id: undefined, providerId: 'telegram-bot-provider' },
    },
  })
})

test('Telegram API error.', async () => {
  mockResponse(
    400,
    JSON.stringify({
      ok: false,
      error_code: 400,
      description: 'Bad Request: chat not found',
    })
  )
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      telegram: 'Telegram API error: Bad Request: chat not found',
    },
    channels: {
      telegram: { id: undefined, providerId: 'telegram-bot-provider' },
    },
  })
})

test('Telegram uses default chatId from provider config.', async () => {
  mockResponse(
    200,
    JSON.stringify({
      ok: true,
      result: {
        message_id: 999,
        chat: { id: -1001234567890 },
        date: 1234567890,
        text: 'Using default chatId',
      },
    })
  )
  const result = await sdk.send({
    telegram: {
      text: 'Using default chatId',
    },
  })
  expect((mockHttp as any).body).toContain('"chat_id":"-1001234567890"')
  expect(result).toEqual({
    status: 'success',
    channels: {
      telegram: { id: '999', providerId: 'telegram-bot-provider' },
    },
  })
})

import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

const mockSendMail = vi.fn()
mockSendMail.mockReturnValue({ messageId: 'returned-id' })
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
  createTransport: () => ({
    sendMail: mockSendMail,
  }),
}))
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
          type: 'smtp',
          auth: {
            user: 'user',
            pass: 'password',
          },
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

test('Smtp should use nodemailer.', async () => {
  const result = await sdk.send(request)
  expect(mockSendMail).toHaveBeenLastCalledWith(request.email)
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: 'returned-id', providerId: 'email-smtp-provider' },
    },
  })
})

test('Smtp should customize requests.', async () => {
  await sdk.send({
    email: {
      ...request.email,
      customize: async (provider: string, request: any) => ({ ...request, subject: 'Hi John!' }),
    },
  })
  expect(mockSendMail).toHaveBeenLastCalledWith({ ...request.email, subject: 'Hi John!' })
})

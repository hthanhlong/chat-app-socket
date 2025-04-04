import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      decoded: JWT_PAYLOAD
      refreshToken: JWT_PAYLOAD
      traceId: string
    }
  }

  interface FriendRequest {
    senderId: number
    senderUuid: string
    senderNickName: string
    receiverUuid: string
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  }

  interface NotificationInput {
    senderId: number
    receiverUuid: string
    type: 'FRIEND' | 'MESSAGE' | 'POST'
    content: string
    status: 'UNREAD' | 'READ'
  }

  interface JWT_PAYLOAD {
    id: number
    uuid: string
    name: string
    nickName: string
  }

  type IFriend = {
    uuid: string
    nickName: string
    name: string
    profilePicUrl: string
    caption: string
  }

  type MessagePayload = {
    uuid: string
    senderUuid: string
    receiverUuid: string
    message: string
    createdAt: string
  }
}

export { JWT_PAYLOAD }

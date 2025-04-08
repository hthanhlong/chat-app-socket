import { Request } from 'express'
import { Socket } from 'socket.io/dist/socket'

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

  type ISocketInstance = {
    id: string
    socket: Socket
  }

  type EmitterEventPayload = {
    requestId: string
    uuid: string
    eventName: string
  }

  type SocketEventPayload<T> = {
    eventName: string
    data: {
      uuid: string
      value: T
    }
  }

  type NotificationPayload = {
    uuid: string
    data: string[]
  }

  type MessagePayload = {
    uuid: string
    senderUuid: string
    receiverUuid: string
    message: string
    data: {
      uuid: string
      senderUuid: string
      receiverUuid: string
      message: string
    }
  }
}

export { JWT_PAYLOAD }

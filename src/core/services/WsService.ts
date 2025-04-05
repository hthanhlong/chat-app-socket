import { Socket } from 'socket.io'
import LoggerService from '../services/LoggerService'
import { JWT_PAYLOAD } from '../../type'
import EmitterService from './EmitterService'
import KafkaService from './KafkaService'
import { v4 as uuidv4 } from 'uuid'

type ISocketInstance = {
  id: string
  socket: Socket
}

type EmitterEventPayload<T> = {
  requestId: string
  data: T
}

type FriendListPayload = {
  uuid: string
  data: string[]
}

class WsService {
  SOCKET_EVENTS = {
    // User
    GET_ONLINE_USERS: 'GET_ONLINE_USERS',
    ANNOUNCE_I_AM_ONLINE_TO_FRIENDS: 'ANNOUNCE_I_AM_ONLINE_TO_FRIENDS',
    HAS_NEW_ONLINE_USER: 'HAS_NEW_ONLINE_USER',
    HAS_NEW_OFFLINE_USER: 'HAS_NEW_OFFLINE_USER',
    // Message
    SEND_MESSAGE: 'SEND_MESSAGE',
    HAS_NEW_MESSAGE: 'HAS_NEW_MESSAGE',
    // Friend
    GET_FRIEND_LIST: 'GET_FRIEND_LIST',
    UPDATE_FRIEND_LIST: 'UPDATE_FRIEND_LIST',
    GET_FRIEND_REQUEST: 'GET_FRIEND_REQUEST',
    SEND_FRIEND_REQUEST: 'SEND_FRIEND_REQUEST',
    ACCEPT_FRIEND_REQUEST: 'ACCEPT_FRIEND_REQUEST',
    REJECT_FRIEND_REQUEST: 'REJECT_FRIEND_REQUEST',
    // Notification
    HAS_NEW_NOTIFICATION: 'HAS_NEW_NOTIFICATION',
    GET_NOTIFICATIONS: 'GET_NOTIFICATIONS',
    UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
    // Close connection
    CLOSE_CONNECTION: 'CLOSE_CONNECTION'
  }

  socketClients: Map<string, ISocketInstance[]> = new Map()
  setTimeoutIds: Map<string, NodeJS.Timeout> = new Map()

  onConnection = async (socket: Socket, data: JWT_PAYLOAD): Promise<void> => {
    try {
      if (!data.uuid) return
      this.socketRegister(socket, data)
      socket.on(
        this.SOCKET_EVENTS.GET_ONLINE_USERS,
        (payload: FriendListPayload) => this.getOnlineFriends(payload)
      )
      socket.on(
        this.SOCKET_EVENTS.ANNOUNCE_I_AM_ONLINE_TO_FRIENDS,
        (payload: FriendListPayload) => this.handleAnUserOnline(payload)
      )
      socket.on(this.SOCKET_EVENTS.SEND_MESSAGE, (payload: MessagePayload) =>
        this.handleSendMessage(payload)
      )
      socket.on('disconnect', () => this.handleDisconnect(socket, data))
      socket.on('error', (err: any) => this.onError(socket, err))
    } catch (error: Error | any) {
      socket.disconnect()
      LoggerService.error({
        where: 'WsService',
        message: `Error on connection: ${error.message}`
      })
    }
  }

  socketRegister = (socket: Socket, data: JWT_PAYLOAD) => {
    try {
      if (!this.socketClients.has(data.uuid)) {
        this.socketClients.set(data.uuid, [
          {
            id: socket.id,
            socket
          }
        ])
      } else {
        this.socketClients.get(data.uuid)?.push({
          id: socket.id,
          socket
        })
      }
    } catch (error: Error | any) {
      socket.disconnect()
      LoggerService.error({
        where: 'WsService',
        message: `Error on connection: ${error.message}`
      })
    }
  }

  sendDataToClient = (uuid: string, data: any) => {
    const clients = this.socketClients.get(uuid)
    if (!clients || clients.length === 0) return
    clients.forEach(({ socket }: ISocketInstance) =>
      socket.emit(data.type, data.payload)
    )
  }

  handleSendMessage = (payload: MessagePayload) => {
    try {
      const { senderUuid, receiverUuid, message, createdAt } = payload
      // Handle message sending
      this.sendDataToClient(receiverUuid, {
        type: this.SOCKET_EVENTS.HAS_NEW_MESSAGE,
        payload: {
          senderUuid,
          receiverUuid,
          message,
          createdAt
        }
      })
    } catch (error: Error | any) {
      LoggerService.error({
        where: 'WsService',
        message: `Error handling send message: ${error.message}`
      })
    }
  }

  getOnlineFriends = (payload: FriendListPayload) => {
    const { uuid, data } = payload
    if (!uuid || !data) {
      LoggerService.error({
        where: 'WsService',
        message: 'Uuid and data are required'
      })
      return
    }
    try {
      if (!uuid) {
        LoggerService.error({
          where: 'WsService',
          message: 'Uuid is required'
        })
        return
      }
      if (Array.isArray(data) && data.length === 0) return
      const onlineFriends: string[] = []
      data.forEach((uuid: string) => {
        if (this.socketClients.has(uuid)) {
          onlineFriends.push(uuid)
        }
      })
      if (onlineFriends.length === 0) return
      this.sendDataToClient(uuid, {
        type: this.SOCKET_EVENTS.GET_ONLINE_USERS,
        payload: onlineFriends
      })
    } catch (error: Error | any) {
      LoggerService.error({
        where: 'WsService',
        message: `Error handling get online friends: ${error.message}`
      })
    }
  }

  handleAnUserOnline = async (payload: FriendListPayload) => {
    const { uuid, data } = payload
    if (!uuid || !data) {
      LoggerService.error({
        where: 'WsService',
        message: 'Uuid and data are required'
      })
      return
    }
    const TIMEOUT_HANDLE_AN_USER_ONLINE = 10000 // 10 seconds
    try {
      if (this.setTimeoutIds.has(`trigger-disconnect-${uuid}`)) {
        clearTimeout(this.setTimeoutIds.get(`trigger-disconnect-${uuid}`))
      }
      if (this.setTimeoutIds.has(`trigger-online-${uuid}`)) {
        clearTimeout(this.setTimeoutIds.get(`trigger-online-${uuid}`))
      }
      const timeoutId = setTimeout(() => {
        data.forEach((friendUuid: string) => {
          if (this.socketClients.has(friendUuid)) {
            this.sendDataToClient(friendUuid, {
              type: this.SOCKET_EVENTS.HAS_NEW_ONLINE_USER,
              payload: uuid
            })
          }
        })
      }, TIMEOUT_HANDLE_AN_USER_ONLINE)
      this.setTimeoutIds.set(`trigger-online-${uuid}`, timeoutId)
    } catch (error: Error | any) {
      LoggerService.error({
        where: 'WsService',
        message: `Error handling an user online: ${error.message}`
      })
    }
  }

  onError = (socket: any, error: Error) => {
    LoggerService.error({
      where: 'WsService',
      message: `Error on socket: ${error.message}`
    })
  }

  handleDisconnect = async (socket: Socket, data: JWT_PAYLOAD) => {
    if (!data.uuid) {
      socket.disconnect()
      return
    }
    const userUuid = data.uuid

    if (this.setTimeoutIds.has(`trigger-disconnect-${userUuid}`)) {
      clearTimeout(this.setTimeoutIds.get(`trigger-disconnect-${userUuid}`))
    }

    if (this.setTimeoutIds.has(`trigger-online-${userUuid}`)) {
      clearTimeout(this.setTimeoutIds.get(`trigger-online-${userUuid}`))
    }

    const TIMEOUT_HANDLE_DISCONNECT = 30000 // 30 second
    const timeoutId = setTimeout(() => {
      try {
        const userUuid = data.uuid
        const requestId = uuidv4()
        KafkaService.produceMessageToTopic('friends-service-request', {
          requestId,
          data: {
            event: 'GET_FRIEND_LIST',
            uuid: userUuid
          }
        })
        const handleAnUserOffline = (
          payload: EmitterEventPayload<{ uuid: string; friends: IFriend[] }>
        ) => {
          if (!payload.requestId || !payload.data) return
          if (requestId !== payload.requestId) return
          const friends = payload.data.friends
          if (!friends) return
          const onlineUsers: IFriend[] = []
          friends.forEach((friend: IFriend) => {
            if (this.socketClients.has(friend.uuid)) {
              onlineUsers.push(friend)
            }
          })
          if (onlineUsers.length === 0) return
          onlineUsers.forEach((friend: IFriend) => {
            this.sendDataToClient(friend.uuid, {
              type: this.SOCKET_EVENTS.HAS_NEW_OFFLINE_USER,
              payload: userUuid
            })
          })
          this.socketClients.delete(userUuid)
          EmitterService.kafkaEmitter.off(
            'GET_FRIEND_LIST',
            handleAnUserOffline
          )
        }
        EmitterService.kafkaEmitter.on('GET_FRIEND_LIST', handleAnUserOffline)
      } catch (error: Error | any) {
        LoggerService.error({
          where: 'WsService',
          message: `Error handling disconnect: ${error.message}`
        })
      }
    }, TIMEOUT_HANDLE_DISCONNECT) // 30 seconds
    this.setTimeoutIds.set(`trigger-disconnect-${userUuid}`, timeoutId)
  }

  handleSendFriendsList =
    (requestId: string) =>
    async (
      payload: EmitterEventPayload<{
        uuid: string
        friends: IFriend[]
      }>
    ) => {
      if (
        !payload.requestId ||
        !payload.data ||
        requestId !== payload.requestId
      ) {
        EmitterService.kafkaEmitter.off(
          'GET_FRIEND_LIST',
          this.handleSendFriendsList(requestId)
        )
        return
      }
      const uuid = payload.data.uuid
      const friends = payload.data.friends
      if (!friends) return
      let onlineUsers: IFriend[] = []
      friends.forEach((friend: IFriend) => {
        if (this.socketClients.has(friend.uuid)) {
          onlineUsers.push(friend)
        }
      })
      this.sendDataToClient(uuid, {
        type: this.SOCKET_EVENTS.GET_ONLINE_USERS,
        payload: onlineUsers
      })
      EmitterService.kafkaEmitter.off(
        'GET_FRIEND_LIST',
        this.handleSendFriendsList(requestId)
      )
    }
}

export default new WsService()

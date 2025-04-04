import { Socket } from 'socket.io'
import LoggerService from '../services/LoggerService'
import { JWT_PAYLOAD } from '../../type'
import EmitterService from './EmitterService'
import KafkaService from './KafkaService'
type ISocketInstance = {
  id: string
  socket: Socket
}

class WsService {
  SOCKET_EVENTS = {
    // User
    GET_ONLINE_USERS: 'GET_ONLINE_USERS',
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

  init() {
    EmitterService.kafkaEmitter.on('GET_ONLINE_USERS', (payload: any) => {
      const key = payload.key?.toString()
      if (!key) return
      const uuid = key
      const friends = payload.value
      if (!friends) return
      let onlineUsers: IFriend[] = []
      friends.forEach((friend: IFriend) => {
        if (this.socketClients.has(friend.uuid)) {
          onlineUsers.push(friend)
        }
      })
      this._sendDataToClient(uuid, {
        type: this.SOCKET_EVENTS.GET_ONLINE_USERS,
        payload: onlineUsers
      })
    })
  }

  onConnection = async (socket: Socket, data: JWT_PAYLOAD): Promise<void> => {
    try {
      if (!data.uuid) return
      this._socketRegister(socket, data)
      await this._getOnlineFriends(data)
      // User
      socket.on(this.SOCKET_EVENTS.GET_ONLINE_USERS, (payload: JWT_PAYLOAD) =>
        this._getOnlineFriends(payload)
      )
      // Message
      socket.on(this.SOCKET_EVENTS.SEND_MESSAGE, (payload: MessagePayload) =>
        this._handleSendMessage(payload)
      )
      // Disconnect
      socket.on('disconnect', () => this._handleDisconnect(data))
      // Error
      socket.on('error', (err: any) => this._onError(socket, err))
    } catch (error: Error | any) {
      socket.disconnect()
      LoggerService.error({
        where: 'WsService',
        message: `Error on connection: ${error.message}`
      })
    }
  }

  getSocketsByUuid = (uuid: string) => {
    if (!uuid) throw new Error('Uuid is required')
    return this.socketClients.get(uuid)
  }

  _socketRegister = (socket: Socket, data: JWT_PAYLOAD) => {
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

  _sendDataToClient = (uuid: string, data: any) => {
    const clients = this.getSocketsByUuid(uuid)
    if (!clients || clients.length === 0) return
    clients.forEach(({ socket }: ISocketInstance) =>
      socket.emit(data.type, data.payload)
    )
  }

  async _handleSendMessage(payload: MessagePayload): Promise<void> {
    try {
      const { senderUuid, receiverUuid, message, createdAt } = payload
      // Handle message sending
      this._sendDataToClient(receiverUuid, {
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

  async _getOnlineFriends(payload: JWT_PAYLOAD): Promise<void> {
    try {
      let onlineUsers: IFriend[] = []
      const { uuid } = payload
      if (!uuid) {
        LoggerService.error({
          where: 'WsService',
          message: 'Uuid is required'
        })
        return
      }
      KafkaService.produceMessageToTopic({
        topic: 'friends-service-request',
        value: {
          uuid
        },
        key: uuid
      })
      if (onlineUsers.length === 0) return
      // send to client
      this._sendDataToClient(uuid, {
        type: this.SOCKET_EVENTS.GET_ONLINE_USERS,
        payload: onlineUsers
      })
    } catch (error: Error | any) {
      LoggerService.error({
        where: 'WsService',
        message: `Error handling get online users: ${error.message}`
      })
    }
  }

  _triggerUpdateOnlineUsers = async (data: JWT_PAYLOAD) => {
    return new Promise((resolve) => {
      if (!data.uuid) return
      const userUuid = data.uuid
      // check if user reconnect, we will clear the timeout
      if (this.setTimeoutIds.has(`trigger-online-${userUuid}`)) {
        clearTimeout(this.setTimeoutIds.get(`trigger-online-${userUuid}`))
        resolve(true)
      }
      if (this.setTimeoutIds.has(`trigger-offline-${userUuid}`)) {
        clearTimeout(this.setTimeoutIds.get(`trigger-offline-${userUuid}`))
      }

      // const timeoutId = setTimeout(async () => {
      //   const friendsIsOnline = await WsHelper.filterOnlineUsers(
      //     WsService.clientSockets,
      //     userUuid
      //   )
      //   if (Array.isArray(friendsIsOnline) && friendsIsOnline.length === 0)
      //     return
      //   friendsIsOnline.forEach((uuid: string) => {
      //     WsService._sendDataToClientByUuid(uuid, {
      //       type: WsService.SOCKET_EVENTS.HAS_NEW_ONLINE_USER,
      //       payload: {
      //         uuid: userUuid
      //       }
      //     })
      //   })
      //   resolve(true)
      // }, 10000)
      // WsService.setTimeoutIds.set(`trigger-online-${userUuid}`, timeoutId)
    })
  }

  _triggerUpdateOfflineUsers = async (data: JWT_PAYLOAD) => {
    return new Promise((resolve) => {
      if (!data.uuid) return
      const userUuid = data.uuid

      // check if user reconnect, we will clear the timeout
      if (this.setTimeoutIds.has(`trigger-offline-${userUuid}`)) {
        clearTimeout(this.setTimeoutIds.get(`trigger-offline-${userUuid}`))
        resolve(true)
      }
      if (this.setTimeoutIds.has(`trigger-online-${userUuid}`)) {
        clearTimeout(this.setTimeoutIds.get(`trigger-online-${userUuid}`))
      }

      // const timeoutId = setTimeout(async () => {
      //   const friendsIsOnline = await WsHelper.filterOnlineUsers(
      //     WsService.clientSockets,
      //     userUuid
      //   )
      //   if (Array.isArray(friendsIsOnline) && friendsIsOnline.length === 0)
      //     return
      //   friendsIsOnline.forEach((uuid: string) => {
      //     WsService._sendDataToClientByUuid(uuid, {
      //       type: WsService.SOCKET_EVENTS.HAS_NEW_OFFLINE_USER,
      //       payload: {
      //         uuid: userUuid
      //       }
      //     })
      //   })
      //   WsService.clientSockets.delete(userUuid);
      //   resolve(true);
      // }, 8000);
      // WsService.setTimeoutIds.set(`trigger-offline-${userUuid}`, timeoutId);
    })
  }

  _onError = (socket: any, error: Error) => {
    LoggerService.error({
      where: 'WsService',
      message: `Error on socket: ${error.message}`
    })
  }

  _handleDisconnect = async (data: JWT_PAYLOAD) => {
    await this._triggerUpdateOfflineUsers(data)
    LoggerService.info({
      where: 'WsService',
      message: `User ${data.uuid} disconnected`
    })
  }
}

export default new WsService()

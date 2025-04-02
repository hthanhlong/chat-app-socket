import { Socket } from 'socket.io'
import LoggerService from '../services/LoggerService'
import WsHelper from '../../helper/wsHelper'
import { JWT_PAYLOAD } from '../../type'

class WsService {
  static SOCKET_EVENTS = {
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

  static clientSockets: Map<string, { id: string; socket: Socket }[]> =
    new Map()
  static setTimeoutIds: Map<string, NodeJS.Timeout> = new Map()

  static onConnection = async (
    socket: Socket,
    data: JWT_PAYLOAD
  ): Promise<void> => {
    try {
      await WsService._handleRegisterSocket(socket, data)
      await WsService._triggerUpdateOnlineUsers(data)
      // User
      socket.on(
        WsService.SOCKET_EVENTS.GET_ONLINE_USERS,
        (payload: ISocketEventGetOnlineUsers) =>
          WsService._handleGetOnlineUsers(payload)
      )
      // Message
      socket.on(
        WsService.SOCKET_EVENTS.SEND_MESSAGE,
        (payload: ISocketEventSendMessage) =>
          WsService._handleSendMessage(payload)
      )
      // Disconnect
      socket.on('disconnect', () => WsService._handleDisconnect(data))
      // Error
      socket.on('error', (err: any) => WsService._onError(socket, err))
    } catch (error: Error | any) {
      socket.disconnect()
      LoggerService.error({
        where: 'WsService',
        message: `Error on connection: ${error.message}`
      })
    }
  }

  static _handleRegisterSocket = async (socket: Socket, data: JWT_PAYLOAD) => {
    return new Promise((resolve, reject) => {
      try {
        if (!WsService.clientSockets.has(data.uuid)) {
          WsService.clientSockets.set(data.uuid, [
            {
              id: socket.id,
              socket
            }
          ])
        } else {
          WsService.clientSockets.get(data.uuid)?.push({
            id: socket.id,
            socket
          })
        }
        resolve(data)
      } catch (error: Error | any) {
        socket.disconnect()
        LoggerService.error({
          where: 'WsService',
          message: `Error on connection: ${error.message}`
        })
        reject(error)
      }
    })
  }

  static _sendDataToClientByUuid = (uuid: string, data: any) => {
    const clients = WsHelper.getClientSocketsByUuid(
      WsService.clientSockets,
      uuid
    )
    if (!clients || clients.length === 0) return
    clients.forEach(({ socket }) => socket.emit(data.type, data.payload))
  }

  static async _handleSendMessage(
    payload: ISocketEventSendMessage
  ): Promise<void> {
    try {
      const { senderUuid, receiverUuid, message, createdAt } = payload
      // Handle message sending
      WsService._sendDataToClientByUuid(receiverUuid, {
        type: WsService.SOCKET_EVENTS.HAS_NEW_MESSAGE,
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

  static async _handleGetOnlineUsers(
    payload: ISocketEventGetOnlineUsers
  ): Promise<void> {
    try {
      const { userUuid } = payload
      const onlineUsers = await WsHelper.filterOnlineUsers(
        WsService.clientSockets,
        userUuid
      )
      WsService._sendDataToClientByUuid(userUuid, {
        type: WsService.SOCKET_EVENTS.GET_ONLINE_USERS,
        payload: onlineUsers
      })
    } catch (error: Error | any) {
      LoggerService.error({
        where: 'WsService',
        message: `Error handling get online users: ${error.message}`
      })
    }
  }

  static _triggerUpdateOnlineUsers = async (data: JWT_PAYLOAD) => {
    return new Promise((resolve) => {
      if (!data.uuid) return
      const userUuid = data.uuid
      // check if user reconnect, we will clear the timeout
      if (WsService.setTimeoutIds.has(`trigger-online-${userUuid}`)) {
        clearTimeout(WsService.setTimeoutIds.get(`trigger-online-${userUuid}`))
        resolve(true)
      }
      if (WsService.setTimeoutIds.has(`trigger-offline-${userUuid}`)) {
        clearTimeout(WsService.setTimeoutIds.get(`trigger-offline-${userUuid}`))
      }

      const timeoutId = setTimeout(async () => {
        const friendsIsOnline = await WsHelper.filterOnlineUsers(
          WsService.clientSockets,
          userUuid
        )
        if (Array.isArray(friendsIsOnline) && friendsIsOnline.length === 0)
          return
        friendsIsOnline.forEach((uuid: string) => {
          WsService._sendDataToClientByUuid(uuid, {
            type: WsService.SOCKET_EVENTS.HAS_NEW_ONLINE_USER,
            payload: {
              uuid: userUuid
            }
          })
        })
        resolve(true)
      }, 10000)
      WsService.setTimeoutIds.set(`trigger-online-${userUuid}`, timeoutId)
    })
  }

  static _triggerUpdateOfflineUsers = async (data: JWT_PAYLOAD) => {
    return new Promise((resolve) => {
      if (!data.uuid) return
      const userUuid = data.uuid

      // check if user reconnect, we will clear the timeout
      if (WsService.setTimeoutIds.has(`trigger-offline-${userUuid}`)) {
        clearTimeout(WsService.setTimeoutIds.get(`trigger-offline-${userUuid}`))
        resolve(true)
      }
      if (WsService.setTimeoutIds.has(`trigger-online-${userUuid}`)) {
        clearTimeout(WsService.setTimeoutIds.get(`trigger-online-${userUuid}`))
      }

      const timeoutId = setTimeout(async () => {
        const friendsIsOnline = await WsHelper.filterOnlineUsers(
          WsService.clientSockets,
          userUuid
        )
        if (Array.isArray(friendsIsOnline) && friendsIsOnline.length === 0)
          return
        friendsIsOnline.forEach((uuid: string) => {
          WsService._sendDataToClientByUuid(uuid, {
            type: WsService.SOCKET_EVENTS.HAS_NEW_OFFLINE_USER,
            payload: {
              uuid: userUuid
            }
          })
        })
        WsService.clientSockets.delete(userUuid);
        resolve(true);
      }, 8000);
      WsService.setTimeoutIds.set(`trigger-offline-${userUuid}`, timeoutId);
    })
  }

  static _onError = (socket: any, error: Error) => {
    LoggerService.error({
      where: 'WsService',
      message: `Error on socket: ${error.message}`
    })
  }

  static _handleDisconnect = async (data: JWT_PAYLOAD) => {
    await WsService._triggerUpdateOfflineUsers(data)
    LoggerService.info({
      where: 'WsService',
      message: `User ${data.uuid} disconnected`
    })
  }
}

export default WsService

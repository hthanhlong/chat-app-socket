import { Request } from 'express'
import JWTService from './JWTService'
import LoggerService from './LoggerService'
import { Socket } from 'socket.io'

class WsService {
  static SOCKET_EVENTS = {
    GET_ONLINE_USERS: 'GET_ONLINE_USERS',
    SEND_MESSAGE: 'SEND_MESSAGE',
    HAS_NEW_MESSAGE: 'HAS_NEW_MESSAGE',
    UPDATE_FRIEND_LIST: 'UPDATE_FRIEND_LIST',
    CLOSE_CONNECTION: 'CLOSE_CONNECTION',
    GET_FRIEND_LIST: 'GET_FRIEND_LIST',
    GET_FRIEND_REQUEST: 'GET_FRIEND_REQUEST',
    SEND_FRIEND_REQUEST: 'SEND_FRIEND_REQUEST',
    ACCEPT_FRIEND_REQUEST: 'ACCEPT_FRIEND_REQUEST',
    REJECT_FRIEND_REQUEST: 'REJECT_FRIEND_REQUEST',
    HAS_NEW_NOTIFICATION: 'HAS_NEW_NOTIFICATION',
    GET_NOTIFICATIONS: 'GET_NOTIFICATIONS',
    UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
    HAS_NEW_ONLINE_USER: 'HAS_NEW_ONLINE_USER',
    HAS_NEW_OFFLINE_USER: 'HAS_NEW_OFFLINE_USER'
  }

  static clientSockets: Map<string, { id: string; socket: Socket }[]> =
    new Map()
  static setTimeoutIds: Map<string, NodeJS.Timeout> = new Map()

  static onConnection = async (
    socket: Socket,
    data: JWT_PAYLOAD
  ): Promise<void> => {
    try {
      await WsService.handleRegisterSocket(socket, data)
      await WsService.triggerUpdateOnlineUsers(data)
      socket.on(WsService.SOCKET_EVENTS.GET_ONLINE_USERS, (payload) =>
        WsService._handleGetOnlineUsers(socket, payload)
      )
      socket.on(WsService.SOCKET_EVENTS.SEND_MESSAGE, (payload) =>
        WsService._handleSendMessage(socket, payload)
      )
      socket.on('disconnect', () => WsService._onClose(data))
      socket.on('error', (err: any) => WsService._onError(socket, err))
    } catch (error: Error | any) {
      socket.disconnect()
      LoggerService.error({
        where: 'WsService',
        message: `Error on connection: ${error.message}`
      })
    }
  }

  static async _handleGetOnlineUsers(
    socket: Socket,
    payload: ISocketEventGetOnlineUsers
  ): Promise<void> {
    try {
      const { userUuid } = payload
      const onlineUsers = await WsService.filterOnlineUsers(userUuid)
      WsService.sendDataToClientByUuid(userUuid, {
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

  static handleRegisterSocket = async (socket: Socket, data: JWT_PAYLOAD) => {
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

  static async _handleSendMessage(
    socket: Socket,
    payload: ISocketEventSendMessage
  ): Promise<void> {
    try {
      const { senderUuid, receiverUuid, message, createdAt } = payload
      // Handle message sending
      WsService.sendDataToClientByUuid(receiverUuid, {
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

  static sendDataToClientByUuid(uuid: string, data: any) {
    const clients = WsService.clientSockets.get(uuid)
    if (!clients) return
    clients.forEach(({ socket }) => socket.emit(data.type, data.payload))
  }

  static triggerUpdateOnlineUsers = async (data: JWT_PAYLOAD) => {
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

      // const timeoutId = setTimeout(async () => {
      //   const friendsIsOnline = await WsService.filterOnlineUsers(userUuid);
      //   if (Array.isArray(friendsIsOnline) && friendsIsOnline.length === 0)
      //     return;
      //   friendsIsOnline.forEach((uuid: string) => {
      //     WsService.sendDataToClientByUuid(uuid, {
      //       type: WsService.SOCKET_EVENTS.HAS_NEW_ONLINE_USER,
      //       payload: {
      //         uuid: userUuid,
      //       },
      //     });
      //   });
      //   resolve(true);
      // }, 10000);
      // WsService.setTimeoutIds.set(`trigger-online-${userUuid}`, timeoutId);
    })
  }

  static triggerUpdateOfflineUsers = async (data: JWT_PAYLOAD) => {
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

      // const timeoutId = setTimeout(async () => {
      //   const friendsIsOnline = await WsService.filterOnlineUsers(userUuid);
      //   if (Array.isArray(friendsIsOnline) && friendsIsOnline.length === 0)
      //     return;
      //   friendsIsOnline.forEach((uuid: string) => {
      //     WsService.sendDataToClientByUuid(uuid, {
      //       type: WsService.SOCKET_EVENTS.HAS_NEW_OFFLINE_USER,
      //       payload: {
      //         uuid: userUuid,
      //       },
      //     });
      //   });
      //   WsService.clientSockets.delete(userUuid);
      //   resolve(true);
      // }, 8000);
      // WsService.setTimeoutIds.set(`trigger-offline-${userUuid}`, timeoutId);
    })
  }

  static getClientSockets = () => {
    return Array.from(WsService.clientSockets.keys())
  }

  static filterOnlineUsers = async (userUuid: string) => {
    const clientSockets = WsService.getClientSockets()
    // const friends = await FriendShipService.getMyFriendsByUuid(userUuid);
    // return clientSockets.filter((uuid: string) =>
    //   friends?.some((friend: any) => friend.uuid === uuid)
    // );
  }

  static _onError = (socket: any, error: Error) => {
    LoggerService.error({
      where: 'WsService',
      message: `Error on socket: ${error.message}`
    })
  }

  static _onClose = async (data: JWT_PAYLOAD) => {
    await WsService.triggerUpdateOfflineUsers(data)
    LoggerService.info({
      where: 'WsService',
      message: `User ${data.uuid} disconnected`
    })
  }
}

export default WsService

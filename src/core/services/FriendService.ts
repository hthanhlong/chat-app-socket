import { FRIEND_TYPE, SOCKET_CHANNEL } from '../../constant'
import {
  EmitterService,
  KafkaService,
  LoggerService,
  WsService
} from '../services'
import { v4 as uuidv4 } from 'uuid'
class FriendService {
  private wsService: typeof WsService = {} as typeof WsService
  private timeoutIds: Map<string, NodeJS.Timeout> = new Map()

  inject = (wsService: typeof WsService) => {
    this.wsService = wsService
  }

  handle = async (payload: SocketEventPayload<string[]>) => {
    const { eventName, data } = payload
    if (!eventName || !data) {
      LoggerService.error({
        where: 'FriendService',
        message: 'Event name and data are required'
      })
      return
    }
    if (eventName === FRIEND_TYPE.INIT) {
      this.getOnlineFriends(payload)
      this.handleAnUserOnline(payload)
    }
  }

  getOnlineFriends = (payload: SocketEventPayload<string[]>) => {
    const { data } = payload
    if (Array.isArray(data.value) && data.value.length === 0) return
    const onlineFriends: string[] = []
    const sockets = this.wsService?.socketClients
    if (!sockets) return
    data.value.forEach((uuid: string) => {
      if (sockets?.has(uuid)) {
        onlineFriends.push(uuid)
      }
    })
    if (onlineFriends.length === 0) return
    this.wsService?.sendDataToClient<string[]>(SOCKET_CHANNEL.FRIEND, {
      eventName: FRIEND_TYPE.GET_ONLINE_FRIEND_LIST,
      data: {
        uuid: data.uuid,
        value: onlineFriends
      }
    })
  }

  handleAnUserOnline = async (payload: SocketEventPayload<string[]>) => {
    const { eventName, data } = payload
    if (!eventName || !data) {
      LoggerService.error({
        where: 'FriendService',
        message: 'Event name and data are required'
      })
      return
    }
    if (this.timeoutIds.has(`trigger-online-${data.uuid}`)) {
      clearTimeout(this.timeoutIds.get(`trigger-online-${data.uuid}`))
    }
    if (this.timeoutIds.has(`trigger-offline-${data.uuid}`)) {
      clearTimeout(this.timeoutIds.get(`trigger-offline-${data.uuid}`))
    }
    const TIMEOUT_HANDLE_AN_USER_ONLINE = 10000 // 10 seconds
    try {
      const timeoutId = setTimeout(() => {
        const sockets = this.wsService?.socketClients
        data.value.forEach((friendUuid: string) => {
          if (sockets?.has(friendUuid)) {
            this.wsService?.sendDataToClient(SOCKET_CHANNEL.FRIEND, {
              eventName: FRIEND_TYPE.HAS_NEW_ONLINE_USER,
              data: {
                uuid: friendUuid,
                value: data.uuid
              }
            })
          }
        })
      }, TIMEOUT_HANDLE_AN_USER_ONLINE)
      this.timeoutIds.set(`trigger-online-${data.uuid}`, timeoutId)
    } catch (error: Error | any) {
      LoggerService.error({
        where: 'WsService',
        message: `Error handling an user online: ${error.message}`
      })
    }
  }

  handleAnUserOffline = (data: JWT_PAYLOAD) => {
    if (!data.uuid) {
      LoggerService.error({
        where: 'WsService',
        message: 'Event name and data are required'
      })
      return
    }

    if (this.timeoutIds.has(`trigger-offline-${data.uuid}`)) {
      clearTimeout(this.timeoutIds.get(`trigger-offline-${data.uuid}`))
    }

    if (this.timeoutIds.has(`trigger-online-${data.uuid}`)) {
      clearTimeout(this.timeoutIds.get(`trigger-online-${data.uuid}`))
    }
    const TIMEOUT_HANDLE_AN_USER_OFFLINE = 15000 // 15 seconds
    try {
      const timeoutId = setTimeout(async () => {
        try {
          const userUuid = data.uuid
          const requestId = uuidv4()

          const _handleAnUserOffline = (
            payload: EmitterEventPayload & { friendList: string[] }
          ) => {
            if (!payload.requestId || !payload.friendList) return
            if (requestId !== payload.requestId) return
            const friends = payload.friendList
            if (!friends) return
            const onlineUsers: string[] = []
            friends.forEach((friendUuid: string) => {
              if (this.wsService?.socketClients.has(friendUuid)) {
                onlineUsers.push(friendUuid)
              }
            })
            if (onlineUsers.length === 0) return
            onlineUsers.forEach((friendUuid: string) => {
              this.wsService?.sendDataToClient(SOCKET_CHANNEL.FRIEND, {
                eventName: FRIEND_TYPE.HAS_NEW_OFFLINE_USER,
                data: {
                  uuid: friendUuid,
                  value: userUuid
                }
              })
            })
            this.wsService?.socketClients.delete(userUuid)
            EmitterService.kafkaEmitter.off(
              'GET_FRIEND_LIST',
              _handleAnUserOffline
            )
          }
          EmitterService.kafkaEmitter.on(
            'GET_FRIEND_LIST',
            _handleAnUserOffline
          )
          KafkaService.produceMessageToTopic('friends-service-request', {
            key: 'GET_FRIEND_LIST',
            value: {
              requestId: requestId,
              eventName: 'GET_FRIEND_LIST',
              uuid: userUuid
            }
          })
        } catch (error: Error | any) {
          LoggerService.error({
            where: 'WsService',
            message: `Error handling disconnect: ${error.message}`
          })
        }
      }, TIMEOUT_HANDLE_AN_USER_OFFLINE)
      this.timeoutIds.set(`trigger-offline-${data.uuid}`, timeoutId)
    } catch (error: Error | any) {
      LoggerService.error({
        where: 'WsService',
        message: `Error handling an user offline: ${error.message}`
      })
    }
  }
}

export default new FriendService()

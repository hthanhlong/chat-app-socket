import { FRIEND_TYPE, SOCKET_CHANNEL } from '../../constant'
import {
  EmitterService,
  KafkaService,
  LoggerService,
  RedisService,
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

  getOnlineFriends = async (payload: SocketEventPayload<string[]>) => {
    const { data } = payload
    if (!data.value || (Array.isArray(data.value) && data.value.length === 0))
      return
    const onlineFriends: string[] = []
    const onlineUsers = await RedisService.getOnlineUsers()
    if (!onlineUsers || onlineUsers.length === 0) return
    data.value.forEach((friendUuid: string) => {
      if (onlineUsers?.includes(friendUuid)) {
        onlineFriends.push(friendUuid)
      }
    })
    if (onlineFriends.length === 0) return
    RedisService.redisPub.publish(
      RedisService.HANDLE_MESSAGE_CHANNEL,
      JSON.stringify({
        eventName: FRIEND_TYPE.GET_ONLINE_FRIEND_LIST,
        data: {
          uuid: data.uuid,
          value: onlineFriends
        }
      })
    )
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
    const { uuid } = data
    if (this.timeoutIds.has(`trigger-online-${uuid}`)) {
      clearTimeout(this.timeoutIds.get(`trigger-online-${uuid}`))
    }
    if (this.timeoutIds.has(`trigger-offline-${uuid}`)) {
      clearTimeout(this.timeoutIds.get(`trigger-offline-${uuid}`))
    }
    const TIMEOUT_HANDLE_AN_USER_ONLINE = 10000 // 10 seconds
    try {
      const timeoutId = setTimeout(async () => {
        const onlineUsers = await RedisService.getOnlineUsers()
        if (!onlineUsers) return
        if (
          !data.value ||
          (Array.isArray(data.value) && data.value.length === 0)
        )
          return
        data.value.forEach((friendUuid: string) => {
          if (onlineUsers?.includes(friendUuid)) {
            RedisService.redisPub.publish(
              RedisService.HANDLE_MESSAGE_CHANNEL,
              JSON.stringify({
                eventName: FRIEND_TYPE.HAS_NEW_ONLINE_USER,
                data: {
                  sendToUuid: friendUuid,
                  value: uuid
                }
              })
            )
          }
        })
      }, TIMEOUT_HANDLE_AN_USER_ONLINE)
      this.timeoutIds.set(`trigger-online-${uuid}`, timeoutId)
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

          const _handleAnUserOffline = async (
            payload: EmitterEventPayload & { friendList: string[] }
          ) => {
            if (!payload.requestId || !payload.friendList) return
            if (requestId !== payload.requestId) return
            const friends = payload.friendList
            if (!friends) return
            const onlineFriends = await this.getOnlineFriendList(friends)
            if (!onlineFriends) return
            RedisService.redisPub.publish(
              RedisService.HANDLE_MESSAGE_CHANNEL,
              JSON.stringify({
                eventName: FRIEND_TYPE.HAS_NEW_OFFLINE_USER,
                data: {
                  uuid: userUuid,
                  value: onlineFriends
                }
              })
            )
          }
          EmitterService.friendEmitter.once(
            'GET_FRIEND_LIST',
            _handleAnUserOffline
          )
          KafkaService.produceMessageToTopic('FRIEND_TOPIC', {
            key: 'GET_FRIEND_LIST',
            value: {
              requestId: requestId,
              eventName: 'GET_FRIEND_LIST',
              uuid: userUuid,
              sendByProducer: 'WS_SERVER'
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

  getOnlineFriendList = async (friendList: string[]) => {
    const onlineUsers = await RedisService.getOnlineUsers()
    if (!onlineUsers) return
    const onlineFriends: string[] = []
    friendList.forEach((friendUuid: string) => {
      if (onlineUsers.includes(friendUuid)) {
        onlineFriends.push(friendUuid)
      }
    })
    if (onlineFriends.length === 0) return
    return onlineFriends
  }
}

export default new FriendService()

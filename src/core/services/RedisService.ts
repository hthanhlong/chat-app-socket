import Redis from 'ioredis'
import envConfig from '../../config'
import LoggerService from './LoggerService'
import { FRIEND_TYPE, SOCKET_CHANNEL } from '../../constant'
import { MESSAGE_TYPE } from '../../constant'
import WsService from './WsService'
class RedisService {
  redisPub!: Redis
  redisSub!: Redis

  HANDLE_MESSAGE_CHANNEL = 'HANDLE_MESSAGE_CHANNEL'

  constructor() {
    this.initPub()
    this.initSub()
  }

  initPub() {
    this.redisPub = new Redis({
      host: envConfig.REDIS_HOST,
      port: Number(envConfig.REDIS_PORT)
    })

    this.redisPub.on('connect', () => {
      LoggerService.info({
        where: 'RedisService',
        message: 'RedisPub connected successfully'
      })
    })

    this.redisPub.on('error', (err) => {
      LoggerService.error({
        where: 'RedisService',
        message: 'Redis error'
      })
      process.exit(1)
    })
  }

  initSub() {
    this.redisSub = new Redis({
      host: envConfig.REDIS_HOST,
      port: Number(envConfig.REDIS_PORT)
    })

    this.redisSub.on('connect', () => {
      LoggerService.info({
        where: 'RedisService',
        message: 'RedisSub connected successfully'
      })
    })

    this.redisSub.on('error', (err) => {
      LoggerService.error({
        where: 'RedisService',
        message: 'Redis error'
      })
      process.exit(1)
    })

    this._subscribe(this.HANDLE_MESSAGE_CHANNEL)
  }

  disconnect() {
    this.redisPub.disconnect()
    this.redisSub.disconnect()
    LoggerService.info({
      where: 'RedisService',
      message: 'Redis disconnected successfully'
    })
  }

  _subscribe(channel: string) {
    this.redisSub.subscribe(channel, (err) => {
      if (err) {
        LoggerService.error({
          where: 'RedisService',
          message: 'Redis subscribe error'
        })
      }
      LoggerService.info({
        where: 'RedisService',
        message: `Redis subscribed to ${channel}`
      })
    })
  }

  unsubscribe(channel: string) {
    this.redisSub.unsubscribe(channel, (err) => {
      if (err) {
        LoggerService.error({
          where: 'RedisService',
          message: 'Redis unsubscribe error'
        })
      }
    })
  }

  publishMessage(data: unknown) {
    this.redisPub.publish(this.HANDLE_MESSAGE_CHANNEL, JSON.stringify(data))
  }

  listenMessageChannel() {
    this.redisSub.on('message', (channel, message) => {
      if (channel === this.HANDLE_MESSAGE_CHANNEL) {
        const payload = JSON.parse(message) as SocketEventPayload<unknown>
        const { eventName, data } = payload
        if (eventName === MESSAGE_TYPE.NEW_MESSAGE) {
          WsService.sendDataToClient(SOCKET_CHANNEL.MESSAGE, {
            eventName,
            data: {
              sendToUuid: data.uuid,
              value: data.value
            }
          })
        }
        if (eventName === FRIEND_TYPE.GET_ONLINE_FRIEND_LIST) {
          WsService.sendDataToClient(SOCKET_CHANNEL.FRIEND, {
            eventName,
            data: {
              sendToUuid: data.uuid,
              value: data.value || []
            }
          })
        }
        if (eventName === FRIEND_TYPE.HAS_NEW_ONLINE_USER) {
          WsService.sendDataToClient(SOCKET_CHANNEL.FRIEND, {
            eventName,
            data: {
              sendToUuid: data.uuid,
              value: data.value || []
            }
          })
        }
        if (eventName === FRIEND_TYPE.HAS_NEW_OFFLINE_USER) {
          WsService.sendDataToClient(SOCKET_CHANNEL.FRIEND, {
            eventName,
            data: {
              sendToUuid: data.uuid,
              value: data.value || []
            }
          })
        }
      }
    })
  }

  async addUserToOnlineList(uuid: string, socketId: string) {
    if (!uuid) {
      LoggerService.error({
        where: 'RedisService',
        message: 'Redis addUserToOnlineList error'
      })
      return
    }

    const existing = await this.redisPub.hget('online-users', uuid)
    const existingSet = new Set(existing ? JSON.parse(existing) : [])

    existingSet.add(socketId)

    await this.redisPub.hset(
      'online-users',
      uuid,
      JSON.stringify([...existingSet])
    )
  }

  async getOnlineUsers() {
    const allUsers = await this.redisPub.hgetall('online-users')
    if (!allUsers || Object.keys(allUsers).length === 0) {
      return []
    }
    console.log('allUsers', allUsers)
    console.log('Object.keys(allUsers)', Object.keys(allUsers))
    return Object.keys(allUsers)
  }

  async getSocketIdsOfAnOnlineUser(uuid: string) {
    const data = await this.redisPub.hget('online-users', uuid)
    if (!data) return []

    try {
      return JSON.parse(data)
    } catch (error) {
      LoggerService.error({
        where: 'RedisService',
        message: `Lỗi parse socketId: ${error}`
      })
      return []
    }
  }

  deleteUserFromOnlineList(uuid: string) {
    this.redisPub.hdel('online-users', uuid)
  }
}

export default new RedisService()

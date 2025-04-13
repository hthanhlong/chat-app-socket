import Redis from 'ioredis'
import envConfig from '../../config'
import LoggerService from './LoggerService'
import { FRIEND_TYPE, NOTIFICATION_TYPE, SOCKET_CHANNEL } from '../../constant'
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
        const payload = JSON.parse(message)
        const { eventName } = payload
        if (eventName === MESSAGE_TYPE.NEW_MESSAGE) {
          const _payload = payload as {
            eventName: string
            requestId: string
            uuid: string
            sendByProducer: string
            data: {
              receiverUuid: string
              message: string
              senderUuid: string
              file: string
              uuid: string
              createdAt: string
            }
          }
          WsService.sendDataToClient(SOCKET_CHANNEL.MESSAGE, {
            eventName,
            data: {
              sendToUuid: _payload.data.receiverUuid,
              value: {
                createdAt: _payload.data.createdAt,
                message: _payload.data.message,
                senderUuid: _payload.data.senderUuid,
                file: _payload.data.file,
                uuid: _payload.data.uuid
              }
            }
          })
        }

        if (eventName === MESSAGE_TYPE.NEW_MESSAGE_HAS_IMAGE) {
          const _payload = payload as {
            eventName: string
            requestId: string
            uuid: string
            sendByProducer: string
            data: {
              receiverUuid: string
              message: string
              senderUuid: string
              file: string
              uuid: string
              createdAt: string
            }
          }
          WsService.sendDataToClient(SOCKET_CHANNEL.MESSAGE, {
            eventName: MESSAGE_TYPE.NEW_MESSAGE,
            data: {
              sendToUuid: _payload.data.receiverUuid,
              value: {
                createdAt: _payload.data.createdAt,
                message: _payload.data.message,
                senderUuid: _payload.data.senderUuid,
                file: _payload.data.file,
                uuid: _payload.data.uuid
              }
            }
          })
        }
        if (eventName === FRIEND_TYPE.GET_ONLINE_FRIEND_LIST) {
          const _payload = payload as {
            eventName: string
            data: {
              uuid: string
              value: string[]
            }
          }
          WsService.sendDataToClient(SOCKET_CHANNEL.FRIEND, {
            eventName,
            data: {
              sendToUuid: _payload.data.uuid,
              value: _payload.data.value || []
            }
          })
        }
        if (eventName === FRIEND_TYPE.HAS_NEW_ONLINE_USER) {
          const _payload = payload as {
            eventName: string
            data: {
              sendToUuid: string
              value: string
            }
          }
          WsService.sendDataToClient(SOCKET_CHANNEL.FRIEND, {
            eventName,
            data: {
              sendToUuid: _payload.data.sendToUuid,
              value: _payload.data.value
            }
          })
        }
        if (eventName === FRIEND_TYPE.HAS_NEW_OFFLINE_USER) {
          const _payload = payload as {
            eventName: string
            data: {
              uuid: string
              value: string[]
            }
          }
          const onlineFriends = _payload.data.value
          if (!onlineFriends) return
          onlineFriends.forEach((friendUuid: string) => {
            WsService.sendDataToClient(SOCKET_CHANNEL.FRIEND, {
              eventName,
              data: {
                sendToUuid: friendUuid,
                value: _payload.data.uuid
              }
            })
          })
          this.deleteUserFromOnlineList(payload.data.uuid)
        }
        if (eventName === NOTIFICATION_TYPE.HAS_NEW_NOTIFICATION) {
          const _payload = payload as {
            eventName: string
            data: {
              sendToUuid: string
              value: string
            }
          }
          WsService.sendDataToClient(SOCKET_CHANNEL.NOTIFICATION, {
            eventName,
            data: {
              sendToUuid: _payload.data.sendToUuid,
              value: _payload.data.value
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

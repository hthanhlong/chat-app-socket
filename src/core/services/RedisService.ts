import Redis from 'ioredis'
import envConfig from '../../config'
import LoggerService from './LoggerService'
import { SOCKET_CHANNEL } from '../../constant'
import { MESSAGE_TYPE } from '../../constant'
import WsService from './WsService'
class RedisService {
  redisPub!: Redis
  redisSub!: Redis

  MESSAGE_CHANNEL = 'MESSAGE_CHANNEL'

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

    this.redisSub.subscribe(this.MESSAGE_CHANNEL, (err) => {
      if (err) {
        LoggerService.error({
          where: 'RedisService',
          message: 'Redis subscribe error'
        })
      }
      LoggerService.info({
        where: 'RedisService',
        message: 'Redis subscribed to MESSAGE_CHANNEL'
      })
    })
  }

  disconnect() {
    this.redisPub.disconnect()
    this.redisSub.disconnect()
    LoggerService.info({
      where: 'RedisService',
      message: 'Redis disconnected successfully'
    })
  }

  subscribe(channel: string) {
    this.redisSub.subscribe(channel, (err) => {
      if (err) {
        LoggerService.error({
          where: 'RedisService',
          message: 'Redis subscribe error'
        })
      }
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
    this.redisPub.publish(this.MESSAGE_CHANNEL, JSON.stringify(data))
  }

  listenChannel(_channel: string) {
    this.redisSub.on('message', (channel, message) => {
      if (channel === _channel) {
        const payload = JSON.parse(message)
        const { data } = payload
        WsService.sendDataToClient(SOCKET_CHANNEL.MESSAGE, {
          eventName: MESSAGE_TYPE.NEW_MESSAGE,
          data: {
            sendToUuid: data.receiverUuid,
            value: data
          }
        })
      }
    })
  }
}

export default new RedisService()

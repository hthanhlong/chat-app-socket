import { Kafka, Producer, Consumer } from 'kafkajs'
import LoggerService from './LoggerService'
import EmitterService from './EmitterService'

class KafkaService {
  kafka: Kafka | undefined
  kafkaProducer: Producer | undefined
  notificationConsumer: Consumer | undefined
  friendConsumer: Consumer | undefined
  init() {
    this.kafka = new Kafka({
      clientId: 'chat-app',
      brokers: ['localhost:19092']
    })
    this.kafkaProducer = this.initProducer()
    this.friendConsumer = this.initConsumer('friend-consumer-group')
    this.notificationConsumer = this.initConsumer('notification-consumer-group')
    this.consumeMessageFromTopicFriendTopic()
    this.consumeMessageFromTopicNotificationTopic()
    this._checkKafkaConnection()
  }

  initProducer() {
    return this.kafka?.producer()
  }

  disconnectProducer() {
    if (!this.kafkaProducer) return
    this.kafkaProducer.disconnect()
  }

  disconnectConsumer() {
    this.friendConsumer?.disconnect()
    this.notificationConsumer?.disconnect()
  }

  initConsumer(groupId: string) {
    return this.kafka?.consumer({
      groupId: groupId,
      sessionTimeout: 30000, // 30 seconds
      heartbeatInterval: 3000, // 3 seconds
      maxBytes: 1024 * 1024, // 1MB
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    })
  }

  async _checkKafkaConnection() {
    try {
      const admin = this.kafka?.admin()
      if (!admin) return
      await admin.connect()
      LoggerService.info({
        where: 'KafkaService',
        message: 'Kafka connected successfully!'
      })
      await admin.disconnect()
    } catch (error) {
      LoggerService.error({
        where: 'KafkaService',
        message: `Kafka connection failed: ${error}`
      })
    }
  }

  async produceMessageToTopic<T>(
    topic: string,
    data: {
      key: string
      value: T & {
        requestId: string
        eventName: string
        uuid: string
        sendByProducer: 'WS_SERVER'
      }
    }
  ) {
    try {
      if (!this.kafkaProducer) return
      await this.kafkaProducer.connect()
      await this.kafkaProducer.send({
        topic,
        messages: [{ key: data.key, value: JSON.stringify(data.value) }]
      })
    } catch (error) {
      LoggerService.error({
        where: 'KafkaService',
        message: `Error producing message to topic ${topic}: ${error}`
      })
      throw error
    } finally {
      if (!this.kafkaProducer) return
      await this.kafkaProducer.disconnect()
    }
  }

  async consumeMessageFromTopicNotificationTopic() {
    if (!this.notificationConsumer) return
    await this.notificationConsumer.connect()
    await this.notificationConsumer.subscribe({
      topic: 'NOTIFICATION_TOPIC',
      fromBeginning: true
    })
    await this.notificationConsumer.run({
      autoCommit: true,
      eachMessage: async ({ message }) => {
        try {
          const value = message.value?.toString()
          if (!value) return

          const _value = JSON.parse(value) as {
            requestId: string
            uuid: string
            eventName: string
            sendByProducer: unknown
          }
          if (_value.sendByProducer === 'WS_SERVER') return
          const { eventName } = _value || {}
          if (eventName) {
            EmitterService.notificationEmitter.emit(eventName, _value)
          }
        } catch (error) {
          LoggerService.error({
            where: 'KafkaService',
            message: `Error processing Kafka message: ${error}`
          })
        }
      }
    })
  }

  async consumeMessageFromTopicFriendTopic() {
    if (!this.friendConsumer) return
    await this.friendConsumer.connect()
    await this.friendConsumer.subscribe({
      topic: 'FRIEND_TOPIC',
      fromBeginning: true
    })

    await this.friendConsumer.run({
      autoCommit: true,
      eachMessage: async ({ message }) => {
        try {
          const value = message.value?.toString() as string
          if (!value) return

          const _value = JSON.parse(value) as {
            requestId: string
            uuid: string
            friendList: string[]
            eventName: string
            sendByProducer: 'WS_SERVER'
          }
          if (_value.sendByProducer === 'WS_SERVER') return
          const { eventName } = _value || {}
          if (eventName) {
            EmitterService.friendEmitter.emit(eventName, _value)
          }
        } catch (error) {
          LoggerService.error({
            where: 'KafkaService',
            message: `Error processing Kafka message: ${error}`
          })
        }
      }
    })
  }
}

export default new KafkaService()

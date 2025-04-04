import { Kafka, Producer, Consumer } from 'kafkajs'
import LoggerService from './LoggerService'
import EmitterService from './EmitterService'

class KafkaService {
  kafka: Kafka | undefined
  kafkaProducer: Producer | undefined
  kafkaConsumer: Consumer | undefined

  init() {
    this.kafka = new Kafka({
      clientId: 'chat-app',
      brokers: ['localhost:19092']
    })
    this.kafkaProducer = this.initProducer()
    this.kafkaConsumer = this.initConsumer('ws-friends-service')
    this.consumeMessageFromTopic('friends-service-response')
    this._checkKafkaConnection()
  }

  initProducer() {
    return this.kafka?.producer()
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

  async produceMessageToTopic<T>({
    topic,
    value,
    key
  }: {
    topic: string
    value: T
    key: string
  }) {
    try {
      if (!this.kafkaProducer) return
      await this.kafkaProducer.connect()
      await this.kafkaProducer.send({
        topic,
        messages: [{ key: JSON.stringify(key), value: JSON.stringify(value) }]
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

  async consumeMessageFromTopic(topic: string) {
    if (!this.kafkaConsumer) return
    await this.kafkaConsumer.connect()
    await this.kafkaConsumer.subscribe({
      topic: topic,
      fromBeginning: true
    })

    await this.kafkaConsumer.run({
      autoCommit: true,
      eachMessage: async ({ message }) => {
        try {
          const value = message.value?.toString()
          const key = message.key?.toString()
          if (key && value) {
            EmitterService.kafkaEmitter.emit('GET_ONLINE_USERS', {
              key: JSON.parse(key),
              value: JSON.parse(value)
            })
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

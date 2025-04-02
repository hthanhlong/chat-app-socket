import { Kafka, Producer, Consumer } from 'kafkajs'
import LoggerService from './LoggerService'

class KafkaService {
  static _kafka: Kafka
  static _kafkaProducer: Producer
  static _kafkaConsumerFriendsService: Consumer

  static async initKafka() {
    this._kafka = new Kafka({
      clientId: 'chat-app',
      brokers: ['localhost:19092']
    })
    this._kafkaProducer = this.createKafkaProducer()
    this._kafkaConsumerFriendsService =
      this.createKafkaConsumer('friends-service')
    await this._checkKafkaConnection()
  }

  static createKafkaProducer() {
    return this._kafka.producer()
  }

  static createKafkaConsumer(groupId: string) {
    return this._kafka.consumer({ groupId })
  }

  static async _checkKafkaConnection() {
    try {
      const admin = this._kafka.admin()
      await admin.connect()
      LoggerService.info({
        where: 'KafkaService',
        message: '✅ Kafka connected successfully!'
      })
      const topics = await admin.listTopics()
      LoggerService.info({
        where: 'KafkaService',
        message: `Available topics: ${topics}`
      })
      await admin.disconnect()
    } catch (error) {
      LoggerService.error({
        where: 'KafkaService',
        message: `❌ Kafka connection failed: ${error}`
      })
    }
  }

  static async produceFriendsService(userUuid: string) {
    await this._kafkaProducer.connect()
    // produce friends service request
    this._kafkaProducer.send({
      topic: 'friends-service-request',
      messages: [{ value: JSON.stringify({ userUuid }) }]
    })
  }

  static async consumeFriendsService() {
    await this._kafkaConsumerFriendsService.connect()
    let friends: string[] = []
    // consume friends service response
    this._kafkaConsumerFriendsService.subscribe({
      topic: 'friends-service-response',
      fromBeginning: true
    })
    this._kafkaConsumerFriendsService.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value?.toString()
        if (value) {
          friends.push(JSON.parse(value))
        }
      }
    })
    return friends
  }
}

export default KafkaService

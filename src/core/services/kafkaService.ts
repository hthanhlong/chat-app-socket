import { Kafka, Producer, Consumer } from 'kafkajs'
import LoggerService from './LoggerService'

class KafkaService {
  static kafka: Kafka
  static kafkaProducer: Producer
  static kafkaConsumer: Consumer

  static async initKafka() {
    this.kafka = new Kafka({
      clientId: 'chat-app',
      brokers: ['localhost:19092']
    })
    await this._checkKafkaConnection()
    this.kafkaProducer = await this.getKafkaProducer()
    this.kafkaConsumer = await this.getKafkaConsumer('chat-app-consumer')
  }

  static async getKafkaProducer() {
    this.kafkaProducer = this.kafka.producer()
    try {
      await this.kafkaProducer.connect()
    } catch (error) {
      LoggerService.error({
        where: 'KafkaService',
        message: `❌ Kafka producer connection failed: ${error}`
      })
    }
    return this.kafkaProducer
  }

  static async getKafkaConsumer(groupId: string) {
    this.kafkaConsumer = this.kafka.consumer({ groupId })
    try {
      await this.kafkaConsumer.connect()
    } catch (error) {
      LoggerService.error({
        where: 'KafkaService',
        message: `❌ Kafka consumer connection failed: ${error}`
      })
    }
    return this.kafkaConsumer
  }

  static async _checkKafkaConnection() {
    try {
      const admin = this.kafka.admin()
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
}

export default KafkaService

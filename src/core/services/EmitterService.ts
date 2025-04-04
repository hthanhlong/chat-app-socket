import { EventEmitter } from 'events'

class EmitterService {
  static kafkaEmitter = new EventEmitter()
}

export default EmitterService

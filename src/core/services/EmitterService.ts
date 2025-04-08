import { EventEmitter } from 'events'

class EmitterService {
  static friendEmitter = new EventEmitter()
  static notificationEmitter = new EventEmitter()
}

export default EmitterService

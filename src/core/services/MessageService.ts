import { MESSAGE_TYPE, SOCKET_CHANNEL } from '../../constant'
import WsService from './WsService'
import KafkaService from './KafkaService'
import { v4 as uuidv4 } from 'uuid'
import EmitterService from './EmitterService'
class MessageService {
  private wsService: typeof WsService = {} as typeof WsService

  inject = (wsService: typeof WsService) => {
    this.wsService = wsService
  }

  handle = async (payload: SocketEventPayload<MessagePayload>) => {
    const { eventName } = payload
    if (!eventName) return
    if (eventName === MESSAGE_TYPE.NEW_MESSAGE) {
      this.sendMessageToKafka(payload.data.value)
    }
  }

  sendMessageToReceiver = (payload: MessagePayload) => {
    const { uuid } = payload
    if (!uuid) return
    this.wsService.sendDataToClient(SOCKET_CHANNEL.MESSAGE, {
      eventName: MESSAGE_TYPE.NEW_MESSAGE,
      data: {
        sendToUuid: payload.data.receiverUuid,
        value: payload.data
      }
    })
  }

  sendMessageToKafka = (payload: MessagePayload) => {
    const { uuid, senderUuid, receiverUuid, message } = payload

    if (!uuid || !senderUuid || !receiverUuid || !message) return
    const requestId = uuidv4()
    KafkaService.produceMessageToTopic('MESSAGE_TOPIC', {
      key: 'NEW_MESSAGE',
      value: {
        requestId,
        eventName: MESSAGE_TYPE.NEW_MESSAGE,
        uuid,
        sendByProducer: 'WS_SERVER',
        data: payload
      }
    })
    EmitterService.messageEmitter.once(MESSAGE_TYPE.NEW_MESSAGE, (_payload) => {
      const { requestId } = _payload
      if (requestId === requestId) {
        this.sendMessageToReceiver(_payload)
      }
    })
  }
}

export default new MessageService()

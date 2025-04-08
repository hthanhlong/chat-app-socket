import EmitterService from './EmitterService'
import WsService from './WsService'
import { SOCKET_CHANNEL, NOTIFICATION_TYPE } from '../../constant'
class NotificationService {
  private wsService: typeof WsService = {} as typeof WsService

  inject = (wsService: typeof WsService) => {
    this.wsService = wsService
  }

  init() {
    EmitterService.notificationEmitter.once(
      'HAS_NEW_NOTIFICATION',
      this.handleHasNewNotification
    )
  }

  handleHasNewNotification = (payload: EmitterEventPayload) => {
    const { uuid } = payload
    this.wsService.sendDataToClient(SOCKET_CHANNEL.NOTIFICATION, {
      eventName: NOTIFICATION_TYPE.HAS_NEW_NOTIFICATION,
      data: {
        sendToUuid: uuid,
        value: {
          uuid
        }
      }
    })
  }
}

export default new NotificationService()

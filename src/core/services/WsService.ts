import { Socket } from 'socket.io'
import LoggerService from '../services/LoggerService'
import { JWT_PAYLOAD } from '../../type'
import { SOCKET_CHANNEL } from '../../constant'
import FriendService from './FriendService'
// import { MessageService, NotificationService } from '.'

class WsService {
  socketClients: Map<string, ISocketInstance[]> = new Map()

  onConnection = async (socket: Socket, data: JWT_PAYLOAD) => {
    if (!data.uuid) return
    await this.socketRegister(socket, data)
    socket.on(SOCKET_CHANNEL.FRIEND, (payload: SocketEventPayload<string[]>) =>
      FriendService.handle(payload)
    )
    // socket.on(
    //   SOCKET_CHANNEL.MESSAGE,
    //   (payload: SocketEventPayload<MessagePayload>) =>
    //     MessageService.handleMessageService(payload)
    // )
    // socket.on(
    //   SOCKET_CHANNEL.NOTIFICATION,
    //   (payload: SocketEventPayload<NotificationPayload>) =>
    //     NotificationService.handleNotificationService(payload)
    // )
    socket.on('disconnect', () => this.handleDisconnect(data))
    socket.on('error', (err: any) => this.onError(err))
  }

  socketRegister = (socket: Socket, data: JWT_PAYLOAD) => {
    return new Promise((resolve, reject) => {
      if (!this.socketClients.has(data.uuid)) {
        this.socketClients.set(data.uuid, [
          {
            id: socket.id,
            socket
          }
        ])
      } else {
        this.socketClients.get(data.uuid)?.push({
          id: socket.id,
          socket
        })
      }
      resolve(true)
    })
  }

  getSocketClients = () => {
    return this.socketClients
  }

  deleteSocketClient = (uuid: string) => {
    this.socketClients.delete(uuid)
  }

  sendDataToClient = <T>(
    channel: string,
    payload: {
      eventName: string
      data: {
        uuid: string
        value: T
      }
    }
  ) => {
    const { eventName, data } = payload
    if (!eventName) {
      LoggerService.error({
        where: 'WsService',
        message: 'Event name is required'
      })
      return
    }
    if (!data) {
      LoggerService.error({
        where: 'WsService',
        message: 'Data is required'
      })
      return
    }
    const clients = this.socketClients.get(data.uuid)
    if (!clients || clients.length === 0) return
    clients.forEach(({ socket }: ISocketInstance) =>
      socket.emit(channel, {
        eventName,
        data
      })
    )
  }

  onError = (error: Error) => {
    LoggerService.error({
      where: 'WsService',
      message: `Error on socket: ${error.message}`
    })
  }

  handleDisconnect = async (data: JWT_PAYLOAD) => {
    FriendService.handleAnUserOffline(data)
  }
}

const wsService = new WsService()
FriendService.inject(wsService)
export default wsService

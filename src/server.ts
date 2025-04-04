import express from 'express'
import { Server, Socket } from 'socket.io'
import envConfig from './config'
import JWTService from './core/services/JWTService'
import WsService from './core/services/WsService'
import { JWT_PAYLOAD } from './type'
import LoggerService from './core/services/LoggerService'
import KafkaService from './core/services/KafkaService'

const main = async () => {
  LoggerService.init()
  KafkaService.init()
  WsService.init()
  const io = new Server({
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', async (socket: Socket) => {
    const accessToken = socket.handshake.query.accessToken
    if (!accessToken) {
      socket.disconnect()
      return
    }
    const data: JWT_PAYLOAD = await JWTService.verifyAccessToken(
      accessToken as string
    )
    if (!data) {
      socket.disconnect()
      return
    } else {
      WsService.onConnection(socket, {
        uuid: data.uuid,
        id: data.id,
        name: data.name,
        nickName: data.nickName
      })
    }
  })

  io.listen(envConfig.SOCKET_PORT as number)
  LoggerService.info({
    where: 'Server',
    message: `Server running at ${envConfig.SOCKET_PORT}`
  })
}

main()

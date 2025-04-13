import { createServer } from 'http'
import express from 'express'
import helmet from 'helmet'
import { Server, Socket } from 'socket.io'
import envConfig from './config'
import JWTService from './core/services/JWTService'
import WsService from './core/services/WsService'
import { JWT_PAYLOAD } from './type'
import LoggerService from './core/services/LoggerService'
import KafkaService from './core/services/KafkaService'
import NotificationService from './core/services/NotificationService'

const main = async () => {
  const app = express()
  const server = createServer(app)
  app.use(helmet())
  LoggerService.init()
  KafkaService.init()
  NotificationService.init()
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', async (socket: Socket) => {
    try {
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
    } catch (error: Error | any) {
      LoggerService.error({
        where: 'Server',
        message: `Error on connection: ${error.message}`
      })
    }
  })
  server.listen(envConfig.SOCKET_PORT as number)
  LoggerService.info({
    where: 'Server',
    message: `Server running at ${envConfig.SOCKET_PORT}`
  })
  process.on('SIGINT', () => {
    KafkaService.disconnectProducer()
    KafkaService.disconnectConsumer()
    LoggerService.info({
      where: 'Server',
      message: `Server stopped`
    })
    process.exit(0)
  })
}

main()

import express from 'express'
import { Server, Socket } from 'socket.io'
import { createServer } from 'http'
import envConfig from './config'
import JWTService from './core/services/JWTService'
import WsService from './core/services/WsService'
import { JWT_PAYLOAD } from './type'
import LoggerService from './core/services/LoggerService'

const main = async () => {
  LoggerService.initLogger()
  const io = new Server({
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket: Socket) => {
    const accessToken = socket.handshake.query.accessToken
    if (!accessToken) {
      socket.disconnect()
      return
    }
    const data: JWT_PAYLOAD = JWTService.verifyAccessToken(
      accessToken as string
    )

    WsService.onConnection(socket, data)
  })

  io.listen(envConfig.SOCKET_PORT as number)
  LoggerService.info({
    where: 'Server',
    message: `Server running at ${envConfig.SOCKET_PORT}`
  })
}

main()

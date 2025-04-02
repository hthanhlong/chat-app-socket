import ws from "ws";
import WsService from "./core/services/WsService";
import envConfig from "./config";
import { LoggerService } from "./core/services";
import { Request } from "express";

class WebSocketService {
  private wss!: ws.Server;

  init() {
    this.wss = new ws.Server({ port: Number(envConfig.SOCKET_PORT) });
    this.wss.on("listening", () => {
      LoggerService.info({
        where: "ws",
        message: `WebSocket server is running on port ${envConfig.SOCKET_PORT}`,
      });
    });
    this.wss.on("connection", (socket: ws.WebSocket, req: Request) => {
      const url = req.url;
      if (url?.startsWith("/ws")) {
        WsService.onConnection(socket, req);
      } else {
        socket.close();
      }
    });
  }
}

export default new WebSocketService();

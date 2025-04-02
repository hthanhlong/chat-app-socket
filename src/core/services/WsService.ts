import { Request } from "express";
import JWTService from "./JWTService";
import LoggerService from "./LoggerService";

class WsService {
  static SOCKET_EVENTS = {
    GET_ONLINE_USERS: "GET_ONLINE_USERS",
    SEND_MESSAGE: "SEND_MESSAGE",
    HAS_NEW_MESSAGE: "HAS_NEW_MESSAGE",
    UPDATE_FRIEND_LIST: "UPDATE_FRIEND_LIST",
    CLOSE_CONNECTION: "CLOSE_CONNECTION",
    GET_FRIEND_LIST: "GET_FRIEND_LIST",
    GET_FRIEND_REQUEST: "GET_FRIEND_REQUEST",
    SEND_FRIEND_REQUEST: "SEND_FRIEND_REQUEST",
    ACCEPT_FRIEND_REQUEST: "ACCEPT_FRIEND_REQUEST",
    REJECT_FRIEND_REQUEST: "REJECT_FRIEND_REQUEST",
    HAS_NEW_NOTIFICATION: "HAS_NEW_NOTIFICATION",
    GET_NOTIFICATIONS: "GET_NOTIFICATIONS",
    UPDATE_NOTIFICATION: "UPDATE_NOTIFICATION",
    HAS_NEW_ONLINE_USER: "HAS_NEW_ONLINE_USER",
    HAS_NEW_OFFLINE_USER: "HAS_NEW_OFFLINE_USER",
  };

  static clientSockets: Map<string, WebSocket> = new Map();
  static setTimeoutIds: Map<string, NodeJS.Timeout> = new Map();

  static onConnection = async (socket: any, req: Request): Promise<void> => {
    try {
      const data = await WsService.handleConnect(socket, req);
      await WsService.triggerUpdateOnlineUsers(data as JWT_PAYLOAD);
      socket.on("message", (event: IWebSocket) => WsService._onMessage(event));
      socket.on("error", (err: any) => WsService._onError(socket, err));
      socket.on("close", () => WsService._onClose(data as JWT_PAYLOAD));
    } catch (error: Error | any) {
      socket.close(1008, "Error on connection");
      LoggerService.error({
        where: "WsService",
        message: `Error on connection: ${error.message}`,
      });
    }
  };

  static async _onMessage(event: IWebSocket): Promise<void> {
    try {
      const data = JSON.parse(event as any);
      if (!data.type) return;
      const { type, payload } = data;
      switch (type) {
        case WsService.SOCKET_EVENTS.GET_ONLINE_USERS:
          const { userUuid } = payload as ISocketEventGetOnlineUsers;
          const onlineUsers = await WsService.filterOnlineUsers(userUuid);
          WsService.sendDataToClientByUuid(userUuid, {
            type: WsService.SOCKET_EVENTS.GET_ONLINE_USERS,
            payload: onlineUsers,
          });
          break;
        case WsService.SOCKET_EVENTS.SEND_MESSAGE:
          const { senderUuid, receiverUuid, message, createdAt } =
            payload as ISocketEventSendMessage;
          // const result = await MessageService.createMessage({
          //   senderUuid,
          //   receiverUuid,
          //   message,
          //   createdAt,
          // });
          // WsService.sendDataToClientByUuid(receiverUuid, {
          //   type: WsService.SOCKET_EVENTS.HAS_NEW_MESSAGE,
          //   payload: {
          //     uuid: result.uuid,
          //     senderUuid,
          //     receiverUuid,
          //     message,
          //     createdAt,
          //   },
          // });
          break;
      }
    } catch (error: Error | any) {
      LoggerService.error({
        where: "WsService",
        message: `Error on message: ${error.message}`,
      });
    }
  }

  static handleConnect = async (socket: any, req: Request) => {
    return new Promise((resolve, reject) => {
      try {
        const accessToken = req.url?.split("?")[1].split("accessToken=")[1];
        if (!accessToken) {
          socket.close(1008, "No access token provided");
          return;
        }
        const data: JWT_PAYLOAD = JWTService.verifyAccessToken(accessToken);
        WsService.clientSockets.set(data.uuid, socket);
        resolve(data);
      } catch (error: Error | any) {
        socket.close(1008, "INVALID_ACCESS_TOKEN");
        LoggerService.error({
          where: "WsService",
          message: `Error on connection: ${error.message}`,
        });
        reject(error);
      }
    });
  };

  static sendDataToClientByUuid(uuid: string, data: any) {
    const client = WsService.clientSockets.get(uuid);
    if (!client) return;
    client.send(JSON.stringify(data));
  }

  static triggerUpdateOnlineUsers = async (data: JWT_PAYLOAD) => {
    return new Promise((resolve) => {
      if (!data.uuid) return;
      const userUuid = data.uuid;
      // check if user reconnect, we will clear the timeout
      if (WsService.setTimeoutIds.has(`trigger-online-${userUuid}`)) {
        clearTimeout(WsService.setTimeoutIds.get(`trigger-online-${userUuid}`));
        resolve(true);
      }
      if (WsService.setTimeoutIds.has(`trigger-offline-${userUuid}`)) {
        clearTimeout(
          WsService.setTimeoutIds.get(`trigger-offline-${userUuid}`)
        );
      }

      // const timeoutId = setTimeout(async () => {
      //   const friendsIsOnline = await WsService.filterOnlineUsers(userUuid);
      //   if (Array.isArray(friendsIsOnline) && friendsIsOnline.length === 0)
      //     return;
      //   friendsIsOnline.forEach((uuid: string) => {
      //     WsService.sendDataToClientByUuid(uuid, {
      //       type: WsService.SOCKET_EVENTS.HAS_NEW_ONLINE_USER,
      //       payload: {
      //         uuid: userUuid,
      //       },
      //     });
      //   });
      //   resolve(true);
      // }, 10000);
      // WsService.setTimeoutIds.set(`trigger-online-${userUuid}`, timeoutId);
    });
  };

  static triggerUpdateOfflineUsers = async (data: JWT_PAYLOAD) => {
    return new Promise((resolve) => {
      if (!data.uuid) return;
      const userUuid = data.uuid;

      // check if user reconnect, we will clear the timeout
      if (WsService.setTimeoutIds.has(`trigger-offline-${userUuid}`)) {
        clearTimeout(
          WsService.setTimeoutIds.get(`trigger-offline-${userUuid}`)
        );
        resolve(true);
      }
      if (WsService.setTimeoutIds.has(`trigger-online-${userUuid}`)) {
        clearTimeout(WsService.setTimeoutIds.get(`trigger-online-${userUuid}`));
      }

      // const timeoutId = setTimeout(async () => {
      //   const friendsIsOnline = await WsService.filterOnlineUsers(userUuid);
      //   if (Array.isArray(friendsIsOnline) && friendsIsOnline.length === 0)
      //     return;
      //   friendsIsOnline.forEach((uuid: string) => {
      //     WsService.sendDataToClientByUuid(uuid, {
      //       type: WsService.SOCKET_EVENTS.HAS_NEW_OFFLINE_USER,
      //       payload: {
      //         uuid: userUuid,
      //       },
      //     });
      //   });
      //   WsService.clientSockets.delete(userUuid);
      //   resolve(true);
      // }, 8000);
      // WsService.setTimeoutIds.set(`trigger-offline-${userUuid}`, timeoutId);
    });
  };

  static getClientSockets = () => {
    return Array.from(WsService.clientSockets.keys());
  };

  static filterOnlineUsers = async (userUuid: string) => {
    const clientSockets = WsService.getClientSockets();
    // const friends = await FriendShipService.getMyFriendsByUuid(userUuid);
    // return clientSockets.filter((uuid: string) =>
    //   friends?.some((friend: any) => friend.uuid === uuid)
    // );
  };

  static _onError = (socket: any, error: Error) => {
    LoggerService.error({
      where: "WsService",
      message: `Error on socket: ${error.message}`,
    });
  };

  static _onClose = async (data: JWT_PAYLOAD) => {
    await WsService.triggerUpdateOfflineUsers(data);
    LoggerService.info({
      where: "WsService",
      message: `User ${data.uuid} disconnected`,
    });
  };
}

export default WsService;

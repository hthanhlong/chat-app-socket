import { Socket } from 'socket.io/dist/socket'

type ClientSocket = {
  id: string
  socket: Socket
}

class WsHelper {
  static getClientSockets = (clientSockets: Map<string, ClientSocket[]>) => {
    return Array.from(clientSockets.keys())
  }

  static getClientSocketById = (
    clientSockets: Map<string, ClientSocket[]>,
    id: string
  ) => {
    return clientSockets.get(id)?.find((client) => client.id === id)
  }

  static getClientSocketsByUuid = (
    clientSockets: Map<string, ClientSocket[]>,
    uuid: string
  ) => {
    return clientSockets.get(uuid)
  }

  static filterOnlineUsers = async (
    clientSockets: Map<string, ClientSocket[]>,
    userUuid: string
  ) => {
    const clients = WsHelper.getClientSockets(clientSockets)
    // const friends = await FriendShipService.getMyFriendsByUuid(userUuid);
    // return clientSockets.filter((uuid: string) =>
    //   friends?.some((friend: any) => friend.uuid === uuid)
    // );
  }
}

export default WsHelper

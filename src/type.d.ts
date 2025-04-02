import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      decoded: JWT_PAYLOAD;
      refreshToken: JWT_PAYLOAD;
      traceId: string;
    }
  }

  interface signUpInput {
    nickName: string;
    username: string;
    email: string;
    password: string;
    caption?: string;
  }

  interface SignInInput {
    email: string;
    password: string;
  }

  interface FriendRequest {
    senderId: number;
    senderUuid: string;
    senderNickName: string;
    receiverUuid: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
  }

  interface NotificationInput {
    senderId: number;
    receiverUuid: string;
    type: "FRIEND" | "MESSAGE" | "POST";
    content: string;
    status: "UNREAD" | "READ";
  }

  interface sendDataToIdByWs {
    type: string;
    payload?: unknown;
  }

  interface JWT_PAYLOAD {
    id: number;
    uuid: string;
    name: string;
    nickName: string;
  }

  interface IWebSocket {
    type: string;
    payload?: unknown;
  }

  interface ISocketEventGetOnlineUsers {
    userUuid: string;
  }

  interface ISocketEventSendMessage {
    uuid: string;
    message: string;
    receiverUuid: string;
    senderUuid: string;
    createdAt: Date;
  }

  interface ISocketEventHasNewMessage {
    senderId: number;
    receiverUuid: string;
    message: string;
    createdAt: Date;
  }

  interface ISocketEventUpdateFriendList {
    userId: number;
  }

  interface ISocketEventCloseConnection {
    userId: number;
  }

  interface ISocketEventGetFriendList {
    userId: number;
  }

  interface ISocketEventGetFriendRequest {
    userId: number;
  }

  interface ISocketEventSendFriendRequest {
    senderId: number;
    receiverUuid: string;
  }

  interface ISocketEventAcceptFriendRequest {
    senderId: number;
    receiverUuid: string;
  }

  interface ISocketEventRejectFriendRequest {
    senderId: number;
    receiverUuid: string;
  }
}

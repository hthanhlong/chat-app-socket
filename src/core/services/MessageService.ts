// import { LoggerService } from '.'

// class MessageService {
//   handleMessageService = async (payload: MessagePayload) => {
//     const { uuid, senderUuid, receiverUuid, message } = payload
//     if (!uuid || !senderUuid || !receiverUuid || !message) {
//       LoggerService.error({
//         where: 'MessageService',
//         message: 'Uuid and senderUuid and receiverUuid and message are required'
//       })
//       return
//     }
//   }
//   // handleMessageChannel = (payload: MessagePayload) => {
//   //   const { uuid, senderUuid, receiverUuid, message } = payload
//   //   if (!uuid || !senderUuid || !receiverUuid || !message) {
//   //     LoggerService.error({
//   //       where: 'WsService',
//   //       message: 'Uuid and senderUuid and receiverUuid and message are required'
//   //     })
//   //     return
//   //   }
//   //   try {
//   //     const { uuid, senderUuid, receiverUuid, message } = payload
//   //     // send message to api service
//   //     await KafkaService.produceMessageToTopic('message-service-request', {
//   //       key: WsHelper.getConversationId(senderUuid, receiverUuid),
//   //       value: {
//   //         uuid,
//   //         senderUuid,
//   //         receiverUuid,
//   //         message
//   //       }
//   //     })
//   //     this.sendDataToClient(SOCKET_CHANNEL.MESSAGE, receiverUuid, {
//   //       type: MESSAGE_TYPE.RECEIVE_MESSAGE,
//   //       payload: {
//   //         uuid,
//   //         senderUuid,
//   //         receiverUuid,
//   //         message
//   //       }
//   //     })
//   //   } catch (error: Error | any) {
//   //     LoggerService.error({
//   //       where: 'WsService',
// }

// export default new MessageService()

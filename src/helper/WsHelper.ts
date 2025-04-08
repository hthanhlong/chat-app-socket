class WsHelper {
  getConversationId = (uuid_1: string, uuid_2: string) => {
    const sorted = [uuid_1, uuid_2].sort()
    return `dm:${sorted[0]}:${sorted[1]}`
  }
}

export default new WsHelper()

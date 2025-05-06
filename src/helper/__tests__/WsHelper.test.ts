import WsHelper from '../WsHelper'

describe('WsHelper', () => {
  describe('getConversationId', () => {
    it('should return the same conversation id regardless of uuid order', () => {
      const uuidA = 'user-123'
      const uuidB = 'user-456'

      const id1 = WsHelper.getConversationId(uuidA, uuidB)
      const id2 = WsHelper.getConversationId(uuidB, uuidA)

      expect(id1).toBe(id2)
    })

    it('should format the conversation id as dm:smaller:larger', () => {
      const uuidA = 'a'
      const uuidB = 'b'
      expect(WsHelper.getConversationId(uuidA, uuidB)).toBe('dm:a:b')
      expect(WsHelper.getConversationId(uuidB, uuidA)).toBe('dm:a:b')
    })

    it('should work with identical uuids', () => {
      const uuid = 'same-user'
      expect(WsHelper.getConversationId(uuid, uuid)).toBe(
        'dm:same-user:same-user'
      )
    })
  })
})

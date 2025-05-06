import FriendService from '../FriendService'
import { FRIEND_TYPE } from '../../../constant'

// Mock dependencies
jest.mock('..', () => ({
  EmitterService: {
    friendEmitter: { once: jest.fn() }
  },
  KafkaService: { produceMessageToTopic: jest.fn() },
  LoggerService: { error: jest.fn() },
  RedisService: {
    getOnlineUsers: jest.fn(),
    redisPub: { publish: jest.fn() },
    HANDLE_MESSAGE_CHANNEL: 'HANDLE_MESSAGE_CHANNEL'
  },
  WsService: {}
}))
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }))

const {
  RedisService,
  EmitterService,
  KafkaService,
  LoggerService
} = require('..')

describe('FriendService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getOnlineFriends', () => {
    it('should publish online friends if any are online', async () => {
      RedisService.getOnlineUsers.mockResolvedValue(['a', 'b', 'c'])
      const payload = { data: { value: ['a', 'd'], uuid: 'user-1' } }
      await FriendService.getOnlineFriends(payload as any)
      expect(RedisService.redisPub.publish).toHaveBeenCalledWith(
        RedisService.HANDLE_MESSAGE_CHANNEL,
        expect.stringContaining(FRIEND_TYPE.GET_ONLINE_FRIEND_LIST)
      )
    })

    it('should not publish if no friends are online', async () => {
      RedisService.getOnlineUsers.mockResolvedValue(['x', 'y'])
      const payload = { data: { value: ['a', 'b'], uuid: 'user-1' } }
      await FriendService.getOnlineFriends(payload as any)
      expect(RedisService.redisPub.publish).not.toHaveBeenCalled()
    })
  })

  describe('handleAnUserOnline', () => {
    it('should set a timeout and publish for online friends', async () => {
      RedisService.getOnlineUsers.mockResolvedValue(['a', 'b'])
      const payload = {
        eventName: 'INIT',
        data: { uuid: 'user-1', value: ['a', 'c'] }
      }
      await FriendService.handleAnUserOnline(payload as any)
      jest.runOnlyPendingTimers()
      await Promise.resolve() // allow async in setTimeout
      expect(RedisService.redisPub.publish).toHaveBeenCalledWith(
        RedisService.HANDLE_MESSAGE_CHANNEL,
        expect.stringContaining(FRIEND_TYPE.HAS_NEW_ONLINE_USER)
      )
    })
  })

  describe('handleAnUserOffline', () => {
    it('should set a timeout and trigger Kafka and Emitter', () => {
      const data = { uuid: 'user-2' }
      FriendService.handleAnUserOffline(data as any)
      jest.runOnlyPendingTimers()
      expect(EmitterService.friendEmitter.once).toHaveBeenCalledWith(
        'GET_FRIEND_LIST',
        expect.any(Function)
      )
      expect(KafkaService.produceMessageToTopic).toHaveBeenCalledWith(
        'FRIEND_TOPIC',
        expect.objectContaining({ key: 'GET_FRIEND_LIST' })
      )
    })
  })

  describe('getOnlineFriendList', () => {
    it('should return only online friends', async () => {
      RedisService.getOnlineUsers.mockResolvedValue(['a', 'b'])
      const result = await FriendService.getOnlineFriendList(['a', 'c'])
      expect(result).toEqual(['a'])
    })

    it('should return undefined if no online users', async () => {
      RedisService.getOnlineUsers.mockResolvedValue(undefined)
      const result = await FriendService.getOnlineFriendList(['a', 'b'])
      expect(result).toBeUndefined()
    })
  })

  describe('handle', () => {
    it('should log error if eventName or data is missing', async () => {
      await FriendService.handle({ eventName: '', data: null } as any)
      expect(LoggerService.error).toHaveBeenCalled()
    })

    it('should call getOnlineFriends and handleAnUserOnline for INIT', async () => {
      const spy1 = jest
        .spyOn(FriendService, 'getOnlineFriends')
        .mockResolvedValue(undefined)
      const spy2 = jest
        .spyOn(FriendService, 'handleAnUserOnline')
        .mockResolvedValue(undefined)
      await FriendService.handle({
        eventName: FRIEND_TYPE.INIT,
        data: { value: [], uuid: 'u' }
      } as any)
      expect(spy1).toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
    })
  })
})

import EmitterService from '../EmitterService'
import { EventEmitter } from 'events'

describe('EmitterService', () => {
  it('should have static EventEmitter instances', () => {
    expect(EmitterService.friendEmitter).toBeInstanceOf(EventEmitter)
    expect(EmitterService.notificationEmitter).toBeInstanceOf(EventEmitter)
    expect(EmitterService.messageEmitter).toBeInstanceOf(EventEmitter)
  })

  it('should emit and listen to events on friendEmitter', (done) => {
    EmitterService.friendEmitter.once('test', (data) => {
      expect(data).toBe('hello')
      done()
    })
    EmitterService.friendEmitter.emit('test', 'hello')
  })

  it('should emit and listen to events on notificationEmitter', (done) => {
    EmitterService.notificationEmitter.once('notify', (msg) => {
      expect(msg).toBe('notify-me')
      done()
    })
    EmitterService.notificationEmitter.emit('notify', 'notify-me')
  })

  it('should emit and listen to events on messageEmitter', (done) => {
    EmitterService.messageEmitter.once('message', (payload) => {
      expect(payload).toEqual({ text: 'hi' })
      done()
    })
    EmitterService.messageEmitter.emit('message', { text: 'hi' })
  })
})

import LocalStorage from '../LocalStorage'
import { Request, Response, NextFunction } from 'express'
import { createNamespace } from 'cls-hooked'

jest.mock('cls-hooked', () => {
  const mNamespace = {
    run: jest.fn((cb) => cb()),
    set: jest.fn(),
    get: jest.fn()
  }
  return {
    createNamespace: jest.fn(() => mNamespace)
  }
})

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}))

describe('LocalStorage middleware', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction
  let namespace: any

  beforeEach(() => {
    req = {}
    res = {}
    next = jest.fn()
    namespace = createNamespace('traceId')
    ;(namespace.set as jest.Mock).mockClear()
    ;(namespace.run as jest.Mock).mockClear()
    ;(namespace.get as jest.Mock).mockClear()
  })

  it('should set traceId and call next()', () => {
    LocalStorage.middleware(req as Request, res as Response, next)
    expect(namespace.run).toHaveBeenCalled()
    expect(namespace.set).toHaveBeenCalledWith('traceId', 'mock-uuid')
    expect(next).toHaveBeenCalled()
  })

  it('should get traceId from namespace', () => {
    ;(namespace.get as jest.Mock).mockReturnValue('mock-uuid')
    const traceId = LocalStorage.getTraceId()
    expect(traceId).toBe('mock-uuid')
    expect(namespace.get).toHaveBeenCalledWith('traceId')
  })
})

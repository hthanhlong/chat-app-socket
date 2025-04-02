class HttpException extends Error {
  static ERROR_TYPES = {
    AccessTokenExpired: 'AccessTokenExpired',
    BadTokenError: 'BadTokenError',
    InternalServerError: 'InternalServerError',
    NotFoundRouteError: 'NotFoundRouteError',
    BadRequestError: 'BadRequestError',
    ForbiddenError: 'ForbiddenError'
  }

  constructor(
    public type: string,
    public message: string,
    public statusCode: number
  ) {
    super()
  }

  static validationError(message: string) {
    return new HttpException(this.ERROR_TYPES.BadRequestError, message, 400)
  }

  static forbiddenError() {
    return new HttpException(this.ERROR_TYPES.ForbiddenError, 'Forbidden', 403)
  }

  static badRequestError() {
    return new HttpException(
      this.ERROR_TYPES.BadRequestError,
      'Bad request',
      400
    )
  }

  static accessTokenExpired() {
    return new HttpException(
      this.ERROR_TYPES.AccessTokenExpired,
      'Access token expired',
      401
    )
  }

  static badTokenError() {
    return new HttpException(this.ERROR_TYPES.BadTokenError, 'Bad token', 401)
  }

  static notFoundError() {
    return new HttpException(
      this.ERROR_TYPES.NotFoundRouteError,
      'Not found',
      404
    )
  }
}

export default HttpException

import jwt, { TokenExpiredError } from 'jsonwebtoken'
import envConfig from '../../config'
import HttpException from '../../exceptions/httpExceptions'
class JWTService {
  generateToken = (payload: JWT_PAYLOAD) => {
    const accessToken = this.signAccessToken(payload)
    const refreshToken = this.signRefreshToken(payload)
    return { accessToken, refreshToken }
  }

  signAccessToken(payload: JWT_PAYLOAD): string {
    return jwt.sign(payload, envConfig.JWT_SECRET_ACCESS, {
      expiresIn: Number(envConfig.ACCESS_TOKEN_TIME)
    })
  }

  signRefreshToken(payload: JWT_PAYLOAD): string {
    return jwt.sign(payload, envConfig.JWT_SECRET_REFRESH, {
      expiresIn: Number(envConfig.REFRESH_TOKEN_TIME)
    })
  }

  async verifyAccessToken(token: string): Promise<JWT_PAYLOAD> {
    return new Promise((resolve, reject) => {
      try {
        const decoded = jwt.verify(
          token,
          envConfig.JWT_SECRET_ACCESS
        ) as JWT_PAYLOAD
        if (!decoded.id) throw HttpException.badTokenError()
        resolve(decoded)
      } catch (error) {
        if (error instanceof TokenExpiredError) {
          reject(HttpException.accessTokenExpired())
        }
        reject(HttpException.badTokenError())
      }
    })
  }

  verifyRefreshToken(token: string): JWT_PAYLOAD {
    try {
      return jwt.verify(token, envConfig.JWT_SECRET_REFRESH) as JWT_PAYLOAD
    } catch (error) {
      throw HttpException.badTokenError()
    }
  }
}
export default new JWTService()

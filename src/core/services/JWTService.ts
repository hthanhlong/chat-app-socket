import jwt, { TokenExpiredError } from "jsonwebtoken";
import envConfig from "../../config";
import HttpException from "../../exceptions/httpExceptions";
class JWTService {
  generateToken = (payload: JWT_PAYLOAD) => {
    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(payload);
    return { accessToken, refreshToken };
  };

  signAccessToken(payload: JWT_PAYLOAD): string {
    return jwt.sign(payload, envConfig.JWT_SECRET_ACCESS, {
      expiresIn: Number(envConfig.ACCESS_TOKEN_TIME),
    });
  }

  signRefreshToken(payload: JWT_PAYLOAD): string {
    return jwt.sign(payload, envConfig.JWT_SECRET_REFRESH, {
      expiresIn: Number(envConfig.REFRESH_TOKEN_TIME),
    });
  }

  verifyAccessToken(token: string): JWT_PAYLOAD {
    try {
      const decoded = jwt.verify(
        token,
        envConfig.JWT_SECRET_ACCESS
      ) as JWT_PAYLOAD;
      if (!decoded.id) throw HttpException.badTokenError();
      return decoded;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw HttpException.accessTokenExpired();
      }
      throw HttpException.badTokenError();
    }
  }

  verifyRefreshToken(token: string): JWT_PAYLOAD {
    try {
      return jwt.verify(token, envConfig.JWT_SECRET_REFRESH) as JWT_PAYLOAD;
    } catch (error) {
      throw HttpException.badTokenError();
    }
  }
}
export default new JWTService();

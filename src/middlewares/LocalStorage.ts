import { NextFunction, Request, Response } from "express";
import { createNamespace } from "cls-hooked";
import { v4 as uuidv4 } from "uuid";
const namespace = createNamespace("traceId");

class LocalStorage {
  traceId: string | undefined;

  constructor() {
    this.traceId = undefined;
  }

  middleware(req: Request, res: Response, next: NextFunction) {
    namespace.run(() => {
      namespace.set("traceId", uuidv4());
      next();
    });
  }

  getTraceId() {
    return namespace.get("traceId");
  }
}

export default new LocalStorage();

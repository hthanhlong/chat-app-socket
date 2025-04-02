// import express from "express";
import WebSocketService from "./wsServer";
// import LocalStorage from "./middlewares/LocalStorage";

const main = async () => {
  // const app = express();
  // app.use(express.json());
  // app.use(express.urlencoded({ extended: true }));
  // app.use(LocalStorage.middleware);
  WebSocketService.init();
};

main();

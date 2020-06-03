import { WebRTCServer } from './WebRTCServer';
import { WebServer } from './WebServer';

let webServer = new WebServer();
let wsServer = new WebRTCServer(webServer);

export { wsServer, webServer };

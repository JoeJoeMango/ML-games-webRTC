import * as config from './constants/serverConfig';
import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs';
import { Server } from 'ws';

export class WebServer{
    private serverConfig = {
        key: fs.readFileSync(config.HTTPS_CONFIG.key),
        cert: fs.readFileSync(config.HTTPS_CONFIG.cert),
    };
    private httpsServer: any; 
    constructor(){
        this.httpsServer = https.createServer(this.serverConfig, this.handleRequest);
        this.httpsServer.listen(config.HTTPS_POST);

    }
    handleRequest = function (request: any, response: any) {
        // switch(request.url){
        //     // case '/webrtc.js':
        //     //     response.writeHead(200, { 'Content-Type': 'application/javascript' });
        //     //     response.end(fs.readFileSync('client/webrtc.js'));      
        //     //     break;
        //     // case '/webrtc2.js':
        //     //     response.writeHead(200, { 'Content-Type': 'application/javascript' });
        //     //     response.end(fs.readFileSync('client/webrtc2.js'));      
        //     //     break;
        //     // case '/style.css':
        //     //     response.writeHead(200, { 'Content-Type': 'text/css' });
        //     //     response.end(fs.readFileSync('client/style.css'));      
        //     //     break;
        //     // case '/test':
        //     //     response.writeHead(200, { 'Content-Type': 'text/html' });
        //     //     response.end(fs.readFileSync('client/test.html'));      
        //     //     break;
        //     // default:
        //     //     response.writeHead(200, { 'Content-Type': 'text/html' });
        //     //     response.end(fs.readFileSync('client/index.html'));      
        //     //     break;
        // }
    };
    getHttpsServer(){
        return this.httpsServer;
    }
}
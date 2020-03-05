import net from 'net';
import access0 from 'events';
let EventEmitter = access0.EventEmitter

class Client extends EventEmitter {
    constructor(port, host){
        super()
        this.port = port ? port : 1337
        this.host = host ? host : '127.0.0.1'
        this.client = new net.Socket()
        this.eof = '\n'
        this.messages()
        this.connected = false
        this.reconnectTime = 5000
        this.isReconnecting = false
        this.isKeepalive = true
        this.keepaliveDelay = 3600000
        this.topics = {}
        this.requestCallbacks = {}
        this.listenCallbacks = {}
        this.responseCallback = {}
        this.timeouts = {}
    }

    get isConnected(){
        return this.connected
    }

    set keepalive(k){
        this.isKeepalive = k
    }

    createId(){
        return 'req:' + Math.random().toString(36).substr(2, 9) + '/' + Math.random().toString(36).substr(2, 9);
    }

    connect(cb){
        let self = this
        cb = (typeof cb === 'function') ? cb : function(){}

        this.client.connect(this.port, this.host, function() {
            self.connected = true
            self.client.setEncoding('utf8');
            self.client.setKeepAlive(self.isKeepalive, self.keepaliveDelay)
            let t = Object.keys(self.topics)
            if(t.length && self.isReconnecting){
                self.isReconnecting = false
                self.sub(t)
            }
            cb()
        });
    }

    sub(topic, cb){
        let self = this

        cb = (typeof cb === 'function') ? cb : function(){}

        if(!Array.isArray(topic)){
            topic = [topic]
        }

        for(let i in topic){
            this.topics[topic[i]] = true
        }

        if(this.connected){
            this.client.write(Buffer.from('s' + JSON.stringify(topic) + self.eof));
            cb(topic)
        }

    }

    unsub(topic, cb){
        let self = this
        cb = (typeof cb === 'function') ? cb : function(){}
        if(!Array.isArray(topic)){
            topic = [topic]
        }

        if(this.connected){
            this.client.write(Buffer.from('u' + JSON.stringify(topic) + self.eof));
            cb(topic)
        }
    }

    pub(topic, payload, cb){
        cb = (typeof cb === 'function') ? cb : function(){}
        if(this.connected){
            this.client.write(Buffer.from('p' + JSON.stringify({ t : topic, p : payload}) + this.eof));
            cb(topic, payload)
        }
    }

    req(topic, payload, cb, timeout){
        let self = this
        let requestId = this.createId() 
        cb = (typeof cb === 'function') ? cb : function(){}
        if(this.connected){
            this.requestCallbacks[requestId] = cb
            this.client.write(Buffer.from('s' + JSON.stringify({ t : [requestId]}) + this.eof));
            this.client.write(Buffer.from('p' + JSON.stringify({ t : topic, p : payload, r: requestId}) + this.eof));
            this.timeouts[requestId] = setTimeout(function(){
                self.requestCallbacks[requestId]('timeout')
                delete self.requestCallbacks[requestId]
                self.client.write(Buffer.from('u' + JSON.stringify({ t : [requestId]}) + self.eof));
            }, timeout || (1000 * 60 * 10) )
        }
    }

    res(payload){
        if(this.connected){
            if(typeof payload === 'undefined'){
                payload = ''
            }
            this.client.write(Buffer.from('p' + JSON.stringify({ t : this._lastRequestId, p : payload}) + this.eof));
        }
    }

    listen(topic, cb){
        if(this.connected){
            this.listenCallbacks[topic] = cb
            this.sub(topic)
        }
    }



    messages(){
        let self = this
        let chunk = ''
        let messages = []
        let len = 0
        let message = ''
        this.client.on('data', function(data) {
            chunk += data.toString()
            if(chunk.indexOf(self.eof) !== -1){
                messages = chunk.split(self.eof)
                len = messages.length
                chunk = ''
                for(let i = 0; i < len; i++){
                    try{

                        message = messages.shift()
                        message = JSON.parse(message)

                        if(self.requestCallbacks[message.t]){
                            // Request callbacks
                            self.requestCallbacks[message.t](null, message.p, message.t)
                            self.client.write(Buffer.from('u' + JSON.stringify([message.t]) + self.eof));
                            clearTimeout(self.timeouts[message.t])
                            delete self.timeouts[message.t]
                            delete self.requestCallbacks[message.t]

                        }else if(self.listenCallbacks[message.t]){
                            // Call the listener callback and pass the response callback
                            self._lastRequestId = message.r
                            let fnc = self.res.bind(self)
                            self.listenCallbacks[message.t](message.p, fnc)

                        }else{
                            // Handle a normal message
                            self.emit('message', message.t,  message.p)

                            if(self.listeners(message.t).length){
                                self.emit(message.t, message.p)
                            }
                                
                        }
                    }
                    catch(e){
                        if(e){
                            //when last chunk is not json while tcp package was too big concat to next package
                            chunk = message.toString()
                        }
                    }
                }
            }
        });

        this.client.on('close', function() {

            self.connected = false

            if(self.isConnected && !self.client.destroyed()){
                delete self.topics
                self.client.destroy()
            }
               
            self.emit('close', 'closed')
        });

        this.client.on('error', function(e) {
            self.isReconnecting = true
            if (e.code === 'ECONNREFUSED') {
                setTimeout(() => self.connect(), self.reconnectTime);
            }
            else if(e.code === 'ECONNRESET'){
                setTimeout(() => self.connect(), self.reconnectTime);
            }
        });

    }

    //THE SERVER CLOSE THE SOCKET
    destroy(){
        let self = this
        self.client.write(Buffer.from('d') + self.eof);
    }
}


export {Client}
export default Client


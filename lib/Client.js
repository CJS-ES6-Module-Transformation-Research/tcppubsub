let net = require('net');
let EventEmitter = require('events').EventEmitter

class Client extends EventEmitter {
    constructor(port, host){
        super()
        this.port = port ? port : 1337
        this.host = host ? host : '127.0.0.1'
        this.client = new net.Socket()
        this.eof = '\n'
        this.connect()
        this.messages()
        this.connected = false
        this.reconnectTime = 5000
        this.isReconnecting = false
        this.isKeepalive = true
        this.keepaliveDelay = 3600000
        this.topics = {}
    }

    get isConnected(){
        return this.connected
    }

    set keepalive(k){
        this.isKeepalive = k
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
        let subTopics = []
        cb = (typeof cb === 'function') ? cb : function(){}

        if(Array.isArray(topic))
            subTopics = topic
        else
            subTopics.push(topic)

        for(let i in subTopics){
            this.topics[subTopics[i]] = true
        }

        if(this.connected){
            self.client.write(Buffer.from('s' + JSON.stringify(subTopics) + self.eof));
            cb(topic)
        }
        else{
            setTimeout(function(){
                self.client.write(Buffer.from('s' + JSON.stringify(subTopics) + self.eof));
                cb(topic)
            },200)
        }

    }

    unsub(topic, cb){
        let self = this
        let subTopics = []
        cb = (typeof cb === 'function') ? cb : function(){}
        if(Array.isArray(topic))
            subTopics = topic
        else
            subTopics.push(topic)

        if(this.connected){
            self.client.write(Buffer.from('u' + JSON.stringify(subTopics) + self.eof));
            cb(topic)
        }
        else{
            setTimeout(function(){
                self.client.write(Buffer.from('u' + JSON.stringify(subTopics) + self.eof));
                cb(topic)
            },200)
        }
    }

    pub(topic, payload, cb){
        let self = this
        cb = (typeof cb === 'function') ? cb : function(){}
        if(this.connected){
            self.client.write(Buffer.from('p' + JSON.stringify({ t : topic, p : payload}) + self.eof));
        }
        else{
            setTimeout(function(){
                self.client.write(Buffer.from('p' + JSON.stringify({ t : topic, p : payload}) + self.eof));
            },200)
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
                        self.emit('message', message.t,  message.p)
                        if(self.listeners(message.t).length)
                            self.emit(message.t, message.p)
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


module.exports = Client



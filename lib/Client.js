let net = require('net');
let EventEmitter = require('events').EventEmitter


class Client extends EventEmitter {
    constructor(port, host){
        super()
        this.port = port ? port : 1337
        this.host = host ? host : '127.0.0.1'
        this.client = new net.Socket()
        this.eof = '\r\n'
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
            self.client.write(Buffer.from(JSON.stringify({ meta : 'subscribe', data : subTopics}) + self.eof));
            cb(topic)
        }
        else{
            setTimeout(function(){
                self.client.write(Buffer.from(JSON.stringify({ meta : 'subscribe', data : subTopics}) + self.eof));
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
            self.client.write(Buffer.from(JSON.stringify({ meta : 'unsubscribe', data : subTopics}) + self.eof));
            cb(topic)
        }
        else{
            setTimeout(function(){
                self.client.write(Buffer.from(JSON.stringify({ meta : 'unsubscribe', data : subTopics}) + self.eof));
                cb(topic)
            },200)
        }

    }

    pub(topic, payload, cb){
        let self = this
        cb = (typeof cb === 'function') ? cb : function(){}
        if(this.connected){
            self.client.write(Buffer.from(JSON.stringify({ meta : 'publish', data : { topic : topic, payload : payload}}) + self.eof));
        }
        else{
            setTimeout(function(){
                self.client.write(Buffer.from(JSON.stringify({ meta : 'publish', data : { topic : topic, payload : payload}}) + self.eof));
            },200)
        }
    }

    messages(){

        let self = this
        let chunk = ''

        this.client.on('data', function(data) {
            chunk += data.toString()
            if(chunk.indexOf(self.eof) !== -1){
                chunk = chunk.split(self.eof)
                for(let i = 0; i < chunk.length; i++){
                    try{
                        chunk[i] = JSON.parse(chunk[i])
                        try{
                            self.emit(chunk[i]['meta'], chunk[i]['data'].topic,  chunk[i]['data'].payload)
                            if(self.listeners(chunk[i]['data'].topic).length){
                                self.emit(chunk[i]['data'].topic, chunk[i]['data'].payload)
                            }
                        }
                        catch(e){
                            console.error(e)
                        }
 
                    }
                    catch(e){
                        if(typeof chunk !== 'undefined' && typeof chunk[i] !== 'undefined')
                             chunk = chunk[i]
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
        this.client.write(Buffer.from(JSON.stringify({ meta : 'destroy' }) + this.eof));
    }
}


module.exports = Client



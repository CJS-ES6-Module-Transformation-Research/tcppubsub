
const net = require('net');
const EventEmitter = require('events').EventEmitter;
const wildcard = require('node-wildcard');

class Server extends EventEmitter {

    constructor(port, host, block){
		super();
        this.port = port ? port : 1337
        this.host = host ? host : '127.0.0.1'
        this.server = net.createServer()
        this.topics = {}
        this.wildcards = {}
        this.eof = '\n'
        this.block = block ? block  : false
    }

    getConnections(cb){
        cb = (typeof cb === 'function') ? cb : function(){}
        this.server.getConnections(function(err, numb){
            cb(err, numb)
        })
    }
    /** 
     * connect the server, init the events and listen to data
    */
    connection(){
        let self = this
        this.server.on('connection',function(sock){
            sock.setEncoding('utf8');
            self.events(sock)
            self.messages(sock)
        })
    }

    /**
     * create the listen server and waiting for messages.
     * When the data arrived, wait until this eof to make the next steps
     * Big Data will emitted as chunks
     * The determing-sign is defined as eof
     * 
     * @param {number} port 
     * @param {string} host 
     */
    listen(){
        let self = this
        this.connection()
        this.server.listen({host: this.host, port: this.port} , function() {  
            console.log('tcppubsub-broker listening on %j', self.server.address());
        });
	}
	
    messages(sock){
        let self = this
        let chunk = ''
        let messages = []
        let len = 0
        let message = ''
        let lastChunk = ''
        sock.on('data', function(data) {
            chunk += data.toString()
            if(chunk.indexOf(self.eof) !== -1){
                messages = chunk.split(self.eof)
                chunk = ''
                len = messages.length
                for(let i = 0; i < len; i++){
                    try{
                        message = messages.shift()
                        self.handle(message.charAt(0), JSON.parse(message.substr(1, message.length)), sock)
                    }
                    catch(e){
                        if(e){
                            //when last chunk is not json because tcp package was too big concat to next package
                            chunk = message
                        }
                    }
                }
            }
        });
    }

    handle(meta, chunk, sock){
        switch(meta){
            case 'p':
                this.publish(chunk.t, chunk.p, sock)
           
                if(Object.keys(this.wildcards).length){
                    this.wildcardpublish(chunk.t, chunk.p, sock)
                }

                this.emit('published', chunk.t,  chunk.p)

            break
            case 's':
                for(let t in chunk){
                    this.subscribe(chunk[t], sock)
                    this.emit('subscribed', chunk[t])
                }
            break
            case 'u':
                for(let t in chunk){
                    this.unsubscribe(chunk[t], sock)
                    this.emit('unsubscribed', chunk[t])            
                }
            break
            case 'd':
                this.destroy(sock)
                this.emit('destroy', sock.address())
            break
            default:
            this.emit('default', chunk)
            break
        }
    }

    /**
     * handle the events
     * @param {socket} sock 
     */
    events(sock){
        let self = this
        let remoteAddress = sock.remoteAddress + ':' + sock.remotePort;

        this.emit('clientConnected', 'Client connected: ' + remoteAddress);

        //handle the certain events
        sock.on('end', function(){
            self.emit('end', 'end');
        });

        sock.on('close',  function () {
            self.emit('close', 'Socket close');
            sock.destroy();
        });

        sock.on('error', function (err) {
            self.emit('error', err.message);
        });
    }

    publish(topic, payload, sock){
        for(let socket in this.topics[topic]){
            try{
                if(this.block){
                    if(this.topics[topic][socket] !== sock){
                        this.topics[topic][socket].write(Buffer.from(JSON.stringify({ t : topic, p : payload}) + this.eof));		
                    }
                }
                else{
                    this.topics[topic][socket].write(Buffer.from(JSON.stringify({ t : topic, p : payload}) + this.eof));	
                }

                this.emit('published', topic, payload)
            }
            catch(e){
                console.error(e)
            }
        }
    }

    wildcardpublish(topic, payload, sock){
        //loop the wildcard topics and check if one match, if so, publish to all sockets
        for(let card in this.wildcards){
            try {
                if(wildcard(topic, card)){
                  
                    for(let socket in this.wildcards[card]){
                        try{
                            if(this.block){
                                if(this.wildcards[card][socket] !== sock){
                                    this.wildcards[card][socket].write(Buffer.from(JSON.stringify({ t : topic, p : payload}) + this.eof));		
                                }
                            }
                            else{
                                this.wildcards[card][socket].write(Buffer.from(JSON.stringify({ t : topic, p : payload}) + this.eof));		
                            }
                        }
                        catch(e){
                            console.error(e)
                        }
                    }
                }
            }
            catch(e){
                console.error(e)
            }
        }
    }

    subscribe(topic, sock){
        if(topic.indexOf('#') === -1){
            if(!this.topics[topic]){
                this.topics[topic] = []
            }
            this.topics[topic].push(sock)
        }
        else{
            this.wildcardsubscribe(topic, sock)
        }
    }

    wildcardsubscribe(topic, sock){
        let card =  topic.replace(/#/g, '*')//topic.slice(0, -1) + '*'
        if(!this.wildcards[card]){
            this.wildcards[card] = []
        }
        this.wildcards[card].push(sock)
    }

    unsubscribe(topic, sock){
        if(topic.indexOf('#') === -1){
            if(this.topics[topic]){
                try {
                    delete this.topics[topic][this.topics[topic].indexOf(sock)]
                }
                catch(e){
                    console.error(e)
                }
            }
        }
        else{
            this.wildcardunsubscribe(topic, sock)
        }
    }

    wildcardunsubscribe(topic, sock){
        let card =  topic.replace(/#/g, '*')//topic.slice(0, -1) + '*'
        if(this.wildcards[card]){
            try {
                delete this.wildcards[card][this.wildcards[card].indexOf(sock)]
            }
            catch(e){
                console.error(e)
            }
        }
    }

    destroy(sock){
        for(let topic in this.topics){
            try{
                delete this.topics[topic][ this.topics[topic].indexOf(sock) ]
            }
            catch(e){
                console.error(e)
            }   
        }
        this.wildcarddestroy(sock)
    }


    wildcarddestroy(sock){
        for(let topic in this.wildcards){
            try{
                delete this.wildcards[topic][ this.wildcards[topic].indexOf(sock) ]
            }
            catch(e){
                console.error(e)
            }   
        } 
    }
}



module.exports = Server

var tcppubsub = require('../lib/main')
 
var port = 2223
var host = 'localhost'
var blockPublisher = false // block payload sending to publisher, if he has subscribed the topic too
 
var broker = new tcppubsub.Broker(port, host, blockPublisher)
broker.listen() 
 
broker.getConnections(function(err, numb){
    console.log('connected members:', numb)
})
 
//you can use some socket-events if needed
broker.on('end', function(msg){console.log('end:', msg)})
broker.on('close', function(member){
    
    broker.getConnections(function(err, numb){
        console.log('connected members:', numb)
    })
     
})
broker.on('error', function(err){console.log('error:', err)})
broker.on('published', function(data){

})
broker.on('subscribed', function(topic){

    if(topic === 'hey/ho')
        broker.pub('hey/ho', 'hello from server')

})
broker.on('unsubscribed', function(topic){console.log('unsubscribed:', topic)})


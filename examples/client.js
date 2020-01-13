var tcppubsub = require('../lib/main')
 
 
var port = 2223
var host = 'localhost'
 
//Create the member
var member = new tcppubsub.Member(port, host)
 
 
member.connect(function(){

    //Subscribe the topic without callback
    member.sub('app/configuration/service')
 
    member.sub('hey/ho')

    // Subscribe the topic STRING or ARRAY
    member.sub('app/configuration/server', function(topic){
 
        // Publish some data STRING, OBJECT, ARRAY
        member.pub('app/configuration/server', {name: 'yamigr', b : 'Hello World'})
    })
 

    member.pub('app/configuration/2', 'after pub', function(){

        setTimeout(function(){
            member.sub('app/configuration/2')
        }, 1000)

    })
 
    // Receive the data on the certain topic
    member.on('app/configuration/server', function(data){
 
        // Unsubscribe the topic
        member.unsub('app/configuration/server')
        console.log('rcv publish:', data)
    })
 
    /******* OR *******/
 
    // Receive all publishes on subscribed data
    member.on('message', function(topic, data){
        member.unsub('app/configuration/server')
        console.log(topic, data)
    })
 
 
    member.listen('app/static/config', function(data, res){
        res({ msg: 'Hello ' + data.name})
    })
 
 
    let timeout = 2000 // default 5000
 
    member.req('app/static/config', { name : 'Peter Pan'}, function(err, data, id){
        if(!err){
            console.log('rcv response:', data.msg)
        }
    }, timeout)
})
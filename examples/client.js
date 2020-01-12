var tcppubsub = require('../lib/main')
 
var port = 2223
var host = 'localhost'

//Create the member
var member = new tcppubsub.Member(port, host)


member.connect(function(){

    //Subscribe the topic without callback
    member.sub('app/configuration/service')

    // Subscribe the topic STRING or ARRAY
    member.sub('app/configuration/server', function(topic){

        // Publish some data STRING, OBJECT, ARRAY
        member.pub('app/configuration/server', {name: 'yamigr', b : 'Hello World'})
    })

    // Receive the data on the certain topic
    member.on('app/configuration/server', function(data){

        // Unsubscribe the topic
        member.unsub('app/configuration/server')
        console.log('rcv publish:', data)
    })


    member.listen('app/static/config', function(data, res){
        console.log('rcv request for static data:', data)
        res({ msg: 'Hello ' + data.name})
    })

    let timeout = 2000 // default 5000

    member.req('app/static/config', { name : 'Peter Pan'}, function(err, data, id){
        if(err){
            // timeout error
        }else{
            console.log('rcv response:', data.msg)
        }
    }, timeout)
})

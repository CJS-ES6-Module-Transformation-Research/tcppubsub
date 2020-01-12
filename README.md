# tcppubsub

> A simple and lightweight submarine build with publish-subscribe-request-response-methods. With a broker called broker :octopus: and a client called member :dolphin:.

![Logo](https://raw.githubusercontent.com/yamigr/tcppubsub/master/images/tcppubsub.png)

A simple and fast exchange of data between nodejs-apps. Use the publish-subscribe-pattern to handle events or use the request-response-pattern to query or serve some data. Otherwise, get into a submarine and look for the octopus.

* [Go to broker](#broker)
* [Go to member](#member)


[![Build Status](https://travis-ci.org/yamigr/tcppubsub.svg?branch=master)](https://travis-ci.org/yamigr/tcppubsub)

## Installing
```sh
npm i tcppubsub
```

<a name="broker"></a>

## Broker :octopus:

A broker handles all data from the members, like sockets, topics and payload. You can use some events to handle the member-data directly at the broker-side.

### Example

```js
var tcppubsub = require('tcppubsub')

var port = 2223
var host = 'localhost'
var block = true // block payload sending to publisher, if he has subscribed the topic too. Default: true

var broker = new tcppubsub.Broker(port, host, block)
broker.listen() 

broker.getConnections(function(err, numb){
    console.log('connected members:', numb)
})

//use the socket-events like:
broker.on('end', function(msg){console.log('end:', msg)})
broker.on('close', function(member){console.log('close:', msg)})
broker.on('error', function(err){console.log('error:', err)})
broker.on('published', function(data){console.log('published:', data)})
broker.on('subscribed', function(topic){console.log('subscribed:', topic)})
broker.on('unsubscribed', function(topic){console.log('unsubscribed:', topic)})
```

<a name="member"></a>

## Member :dolphin:

* Publish-subscribe data.
* Listen on requests.
* Query some data from listeners.
* Topic without wildcard 'app/configuration/server' .
* Topic with wildcard 'app/configuration/#' or 'app/#/configuration',....
* Data can be a string or a object and is emitted as a buffer.
* When the broker restarting, it will automatically resubscribe all topics from subscription or listeners.

### Connect

Call the connect-method to connect the member.

```js
member.connect(function(){
    // Use other methods like sub, unsub, pub, req, listen in here.
})
```

### Subscribe

Subscribe a topic. For multiple topics give a array of topics like ['topic1', 'topic2',...].
```js
member.sub(topic, function(topic){})
```

### Unsubscribe

Unsubscribe a topic. For multiple topics give a array of topics like ['topic1', 'topic2',...].
```js
member.unsub(topic)
```

### Publish

Publish some data on a topic.
```js
member.pub(topic, data)
```

### Request

Make a request on a listener topic. Set some timeout in ms for handle timeout-errors. Default-timeout: 10min.
```js
member.req(topic, data, function(err, data, id){
    if(err){
        console.log(err) // timeout error
    }else{
        console.log(data)
    }
}, timeout)
```

### Listen

Listen on a specific topic for requests. Handle the data and send the response with res.
```js
member.listen(topic, function(data, res){
    console.log(data)
    res(data)
})
```

### Example

```js
var tcppubsub = require('tcppubsub')

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



```

## Authors

* **Yannick Grund** - *Initial work* - [yamigr](https://github.com/yamigr)

## ToDo

* Benchmark tests (broker and members)

## License

This project is licensed under the MIT License - see the [LICENSE.md](lib/LICENSE.md) file for details


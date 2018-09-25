# tcppubsub

> A simple node-js-tcp publish-subscribe framework. With a broker and a client called member.

The idea of this framework is, to let diffrent nodejs-apps communicate together. I know there are diffrent kinds of pub-sub-patterns. But i was interested to do this implementation by the net-library.

* [Go to broker](#broker)
* [Go to member](#member)


[![Build Status](https://travis-ci.org/yamigr/tcppubsub.svg?branch=master)](https://travis-ci.org/yamigr/tcppubsub)

## Installing
```sh
npm install tcppubsub --save
```

<a name="broker"></a>

## Broker

* A broker handles all data from the members, like sockets, topics and payload. You can use some events do handle the member-data directly at the broker-side.

```js
var tcppubsub = require('tcppubsub')

var port = 2223
var host = 'localhost'
var blockPublisher = false // block payload sending to publisher, if he has subscribed the topic too

var broker = new tcppubsub.Broker(port, host, blockPublisher)
broker.listen() 

broker.getConnections(function(err, numb){
    console.log('connected members:', numb)
})

//you can use some socket-events if needed
broker.on('end', function(msg){console.log(msg)})
broker.on('close', function(member){console.log(member)})
broker.on('error', function(err){console.log(err)})
broker.on('published', function(topic, data){console.log(topic, data)})
broker.on('subscribed', function(topic){console.log(topic)})
broker.on('unsubscribed', function(topic){console.log(topic)})
```

<a name="member"></a>

## Member

* A member is a client, which can connect to the broker, publish, subscribe, unsubscribe topics or wildcard-topics (#) and some data.
* [Go to other member](#other) which is in another application
* Topic without wildcard 'app/configuration/server' 
* Topic with wildcard 'app/configuration/#' or 'app/#/configuration',....
* Data can be a string or a object and is emitted as a buffer

```js
var tcppubsub = require('tcppubsub')

var port = 2223
var host = 'localhost'

//Create the member
var member = new tcppubsub.Member(port, host)

//Subscribe the topic without callback
member.sub('other/member/timer')

// Subscribe the topic STRING or ARRAY
member.sub('app/configuration/server', function(topic){

    // Publish some data STRING, OBJECT, ARRAY
    member.pub('app/configuration/server', {a : 1, b : 'Hello World'})
})

// Receive the data on the certain topic
member.on('app/configuration/server', function(data){

    // Unsubscribe the topic
    member.unsub('app/configuration/server')
    console.log(data)
})

/******* OR *******/

// Receive all subscribed data
member.on('message', function(topic, data){
    member.unsub('app/configuration/server')
    console.log(topic, data)
})

```

<a name="other"></a>

# other Member
```js
var tcppubsub = require('tcppubsub')

var port = 2223
var host = 'localhost'

//Create the member
var other = new tcppubsub.Member(port, host)

//publish data on the topic 'other/member/timer'
setInterval(function(){
    other.pub('other/member/timer', 'Moin moin at ' + Date())
},1000)



```

## Authors

* **Yannick Grund** - *Initial work* - [yamigr](https://github.com/yamigr)

## ToDo

* Benchmark tests (broker and members)

## License

This project is licensed under the MIT License - see the [LICENSE.md](lib/LICENSE.md) file for details


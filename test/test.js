var assert = require('assert')
var tcppubsub = require('../lib/main')

var port = 2222
var host = 'localhost'


var broker = new tcppubsub.Broker(port, host, false)
var member
var did = false
describe('Server', function() {
    before(function () {
        broker.listen()
    })

    describe('#Member connect', function() {
        it('create member-client', function(done) {
            member = new tcppubsub.Member(port, host)
            assert.equal((member instanceof tcppubsub.Member), true)

            member.connect(function(){
                done()
            })

        })
    })

    describe('#Member action', function() {

        it('subscribe and publish data in namespace and get the data in message namespace', function(done) {
            member.sub('namespace/test', function(topic){
                member.pub('namespace/test', 'Hello World! My name is..')
            })
            member.on('message', function(topic, data){
                if(!did){
                    did  = true
                    assert.equal(data, 'Hello World! My name is..')
                    done()
                }

            })
        })

        it('subscribe and publish data and get the data in same namespace', function(done) {
    
            member.sub('namespace/test/a', function(topic){
                member.pub('namespace/test/a', 'Hello World! My name is..')
            })
            member.on('namespace/test/a', function(data){
                assert.equal(data, 'Hello World! My name is..')
                done()
            })
        })
   
        it('subscribe wildcard', function(done) {
            member.sub('namespace/wild/#', function(topic){
                member.pub('namespace/wild/card', { a: 'Hello', b : 'World'})
            })
            member.on('namespace/wild/card', function(data){
                assert.equal(data.toString(), { a: 'Hello', b : 'World'}.toString())
                done()
            })
        })


        it('request response pattern ok', function(done) {
            member.listen('namespace/static', function(data, res){
                res(data + 1)
            })
        
            member.req('namespace/static', 1, function(err, data, id){
                if(err){
                    // timeout error
                }else{
                    assert.equal(data, 2)
                    done()
                }
            })
        })


        it('request response pattern error timeout', function(done) {
            member.listen('namespace/timeout', function(data, res){

            })
        
            member.req('namespace/timeout', 1, function(err, data, id){
                if(err){
                    assert.notEqual(err, null)
                    done()
                }
            },10)
        })

        it('test done', function(done) {
            process.exit()
        })       
    
    })
})
  
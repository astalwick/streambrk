var assert      = require("assert")
  , stream      = require('stream')
  , should      = require('should')
  , seedrandom  = require('seedrandom')
  , crypto      = require('crypto')
  , util        = require('util')

  , StreamBrk   = require("../StreamBrk")

function FakeReadableStream(options) {
  var self = this;
  this.maxLength = options.maxLength;
  this.totalWritten = 0;
  this.hash = crypto.createHash('md5');

  this.on('end', function() {
    self.hash = self.hash.digest('hex');
  })
  Math.seedrandom(options.seed || 1);
  stream.Readable.call(this, options)
}

util.inherits(FakeReadableStream, stream.Readable);

FakeReadableStream.prototype._read = function(size) {
  if(this.totalWritten + size > this.maxLength)
    size = this.maxLength - this.totalWritten;

  if(size <= 0) {
    this.push(null);
    return;
  }

  var buf = new Buffer(size)
    , written = 0
    ;

  while(written < size) {
    buf.writeUInt8(Math.floor(Math.random()*256), written);
    written++;
  }

  this.totalWritten += written;
  this.hash.update(buf);
  this.push(buf);
}

function FakeWritableStream(options) {
  var self = this;
  options = options || {};
  this.writeDelay = options.writeDelay;
  this.hash = crypto.createHash('md5');

  this.on('finish', function() {
    self.hash = self.hash.digest('hex');
  })  
  stream.Writable.call(this, options);
}
util.inherits(FakeWritableStream, stream.Writable);

FakeWritableStream.prototype._write = function(chunk, encoding, callback) {
  this.hash.update(chunk);
  if(this.writeDelay)
    setTimeout(callback, this.writeDelay)
  else
    setImmediate(callback);
}



function streamTester(done, options) {
  options           = options || {}
  var length        = options.length || 1000000
    , partSize      = options.partSize || 50000
    , highWaterMark = options.highWaterMark
    , writeDelay    = options.writeDelay
    , seed          = options.seed

    var r = new FakeReadableStream({maxLength: length, seed: seed});
    var s = new StreamBrk({
      newPartFn: function(partNumber, callback) {
        callback(null, new FakeWritableStream({highWaterMark: highWaterMark, writeDelay: writeDelay}));
      }
    , partSize: partSize
    });
    s.on('finish', function(){
      done();
      r.hash.should.equal(s.hash)
    });

    r.pipe(s);
}

describe('StreamBrk', function(){
  it('should have sane defaults', function() {
    var s = new StreamBrk()
    s.should.have.property('partSize');
    s.partSize.should.be.above(1024);
    s.should.have.property('bytesWritten');
    s.bytesWritten.should.equal(0);
    s.should.have.property('bytesThisPart');
    s.bytesThisPart.should.equal(0);    
  });

  it('should split stream', function(done) {
    streamTester(done, {seed: 1});
  });

  it('should split stream that pushes back', function(done) {
    streamTester(done, {
        length: 10000
      , partSize: 1000
      , highWaterMark: 100
      , writeDelay: 10
      , seed: 2
    });
  })

  it('should not split stream when stream is smaller than part', function(done) {
    streamTester( done, {
      length: 500
    , partSize: 5000
    , seed: 3
    })
  });
  it('should not split stream when stream is equal to part', function(done) {
    streamTester( done, {
      length: 5000
    , partSize: 5000
    , seed: 4
    })
  });  
})
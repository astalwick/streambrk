var stream  = require('stream')
  , util    = require('util')
  , async   = require('async')
  , crypto  = require('crypto')

var StreamBrk = module.exports = function (options) {
  options             = options || {};
  this.newPartFn      = options.newPartFn;
  this.partSize       = options.partSize || 50000;

  this.bytesWritten   = 0;
  this.bytesThisPart  = 0;

  this.hash           = crypto.createHash('md5');

  this.currentStream;
  this.startTime;

  this.on('finish', this._onFinish);

  stream.Writable.call(this, options);
};
util.inherits(StreamBrk, stream.Writable);

StreamBrk.prototype._write = function(chunk, encoding, callback) {
  if(!this.startTime)
    this.startTime = new Date().getTime();
  var self = this;

  async.whilst(function() {
    // keep going as long as we have more data.
    return chunk && chunk.length > 0;
  }, function(callback) {
    var partComplete = false
      , chunkToWrite
      ;

    if(self.bytesThisPart + chunk.length > self.partSize) {
      // we can't write more data than there is room in our part.
      // so, if we HAVE more data, we need to 
      // a) slice it and take as much data as we can, so we can finish our part,
      // b) remember the leftover data for our next time around.
      partComplete = true;
      chunkToWrite = chunk.slice(0, self.partSize - self.bytesThisPart);
      chunk = chunk.slice(self.partSize - self.bytesThisPart, chunk.length);
    }
    else {
      // ah, good, we can just write everything that was passed in to
      // _write.
      chunkToWrite = chunk;

      // (nothing more to write on the next pass around)
      chunk = undefined;
    }

    async.waterfall([
      function(callback) {
        if(self.currentStream)
          callback(null, null)
        else {
          self.newPartFn(callback)
        }
      }
    , function(newPart, callback) {
        if(newPart)
          self.currentStream = newPart;
        self.currentStream.write(chunkToWrite, encoding, callback);
      }
    , function(callback) {
        // we wrote some data!  update the internals.
        self.hash.update(chunkToWrite);
        self.bytesThisPart += chunkToWrite.length;
        self.bytesWritten += chunkToWrite.length;

        if(partComplete)
          // oh, we completed a part.  end it and callback when done.       
          self.currentStream.end(function() {
            self.bytesThisPart = 0;
            self.currentStream = undefined;
            callback();
          });
        else
          callback();
      }], callback)
  }, callback);
}


StreamBrk.prototype._calcThroughput = function(startTime, bytes) {
  var totalMs     = new Date().getTime() - startTime
    , throughput  = Math.round((bytes / 1024) / (totalMs / 1000))
    ;
  return throughput + ' kilobytes per second'
}

StreamBrk.prototype._onFinish = function() {
  if(process.env.DEBUG == 'true')
    console.log('StreamBrk total throughput', this._calcThroughput(this.startTime, this.bytesWritten));
  this.hash = this.hash.digest('hex');
}

exports.StreamBrk = StreamBrk;  

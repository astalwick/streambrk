StreamBrk - Simple Node.js Stream Splitter
=========

**StreamBrk** is a stream utility that will split data written to it off into multiple smaller streams.  It fully supports all Node.js [Streams2](http://nodejs.org/api/stream.html) functionality, including piping and back-pressure.

Installation
------------

```bash
npm install streambrk
```

Use
---

StreamBrk is [Writable](http://nodejs.org/api/stream.html#stream_class_stream_writable) stream.  That means that you can pipe any readable stream to it, or simply write to it yourself.

StreamBrk takes all of the typical [Writable stream](http://nodejs.org/api/stream.html#stream_class_stream_writable) options on creation, along with two additional options: 
- `newPartFn(partNumber, callback)`: This is a function that is called by StreamBrk when it needs a new part stream.  The function should create a new stream and callback in the standard node.js form: `callback(err, newStream)`.  Callbacks are used just in case you need a little bit of time to go off and find your new stream.
- `partSize`: This is the maximum number of bytes to be written to an individual part before requesting the next part.  Defaults to 50000.

So, briefly, usage looks something like this:

```javascript
var newPartFn = function(partNumber, callback) {
  var writeStream = fs.createWriteStream('./streambrk_'+partNumber+'.txt');
  callback(null, writeStream);
}

var streamBrk = new StreamBrk({ partSize: 25000, newPartFn: newPartFn });
var readStream = fs.createReadStream('./someHugeFile.txt');

readStream.pipe(streamBrk);
```

Licence
-------
MIT

require('rconsole')
var http = require('http');
var httpProxy = require('http-proxy');
var request = require('request');
var configuration = require('./configuration')

var proxy = httpProxy.createProxyServer({
  target: configuration.proxyTarget
});

http.createServer(function(req, res) {
  proxy.web(req, res);
  proxy.on('proxyRes', function(res){
    var body = '';
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function(){
      assemblyUrl = JSON.parse(body).assembly_url;
      console.debug("received proxy response, polling assemblyUrl: %s", assemblyUrl)
      pollAssembly(assemblyUrl);
    });
  });
}).listen(configuration.proxyPort);

console.debug("listening on %d, forwarding to %s, notifying %s", configuration.proxyPort, configuration.proxyTarget, configuration.notifyUrl)

function pollAssembly(assemblyUrl, triesLeft){
  if(triesLeft < 1){
    console.debug("No tries left, giving up on checking assemblyUrl: %s", assemblyUrl);
    return;
  }
  if(triesLeft === undefined){
    triesLeft = 10;
  }
  setTimeout(function(){
    checkAssembly(assemblyUrl, function(err, response){
      if(!response){
        --triesLeft;
        console.debug("%s not completed, checking again, %s tries left.", assemblyUrl, triesLeft);
        pollAssembly(assemblyUrl, triesLeft);
      }
      else{
        console.debug("%s valid response, notifying.", assemblyUrl)
        notify(response);
      }
    });
  }, configuration.pollInterval);
}

function checkAssembly(assemblyUrl, callback){
  request.get(assemblyUrl, function(err, res, body){
    var response = JSON.parse(body);
    if(response.ok){
      if(response.ok == 'ASSEMBLY_COMPLETED'){
        console.debug('%s completed.', assemblyUrl)
        callback(null, response);
      }
      if(response.ok == 'ASSEMBLY_EXECUTING'){
        console.debug('%s still executing.', assemblyUrl)
        callback(null);
      }
    }
    else{
      callback('error');
    }
  });
}

function notify(response){
  request.post(configuration.notifyUrl, {
    form: {
      transloadit: JSON.stringify(response)
    }
  });
}

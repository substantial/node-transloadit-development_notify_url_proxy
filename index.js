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
      pollAssembly(assemblyUrl);
    });
  });
}).listen(configuration.proxyPort);

function pollAssembly(assemblyUrl, triesLeft){
  if(triesLeft < 1){
    return;
  }
  if(triesLeft === undefined){
    triesLeft = 10;
  }
  setTimeout(function(){
    checkAssembly(assemblyUrl, function(err, response){
      if(!response){
        pollAssembly(assemblyUrl, --triesLeft);
      }
      else{
        notify(response);
      }
    });
  }, 1000);
}

function checkAssembly(assemblyUrl, callback){
  request.get(assemblyUrl, function(err, res, body){
    var response = JSON.parse(body);
    if(response.ok){
      if(response.ok == 'ASSEMBLY_COMPLETED'){
        callback(null, response);
      }
      if(response.ok == 'ASSEMBLY_EXECUTING'){
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

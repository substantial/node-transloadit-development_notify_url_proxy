var http = require('http');
var httpProxy = require('http-proxy');
var request = require('request');

var proxy = httpProxy.createProxyServer({
  target: 'https://api2.transloadit.com/assemblies/'
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
}).listen(8888);

function pollAssembly(assemblyUrl, triesLeft){
  if(triesLeft < 1){
    return;
  }
  if(triesLeft === undefined){
    triesLeft = 10;
  }
  setTimeout(function(){
    checkAssembly(assemblyUrl, function(err, assemblyId){
      if(!assemblyId){
        pollAssembly(assemblyUrl, --triesLeft);
      }
      else{
        notify(assemblyId);
      }
    });
  }, 1000);
}

function checkAssembly(assemblyUrl, callback){
  http.get(assemblyUrl, function(res){
    var body = '';
    res.on('data', function(chunk){
      body += chunk;
    });
    res.on('end', function(){
      var response = JSON.parse(body);
      if(response.ok){
        if(response.ok == 'ASSEMBLY_COMPLETED'){
          callback(null, response.assembly_id);
        }
        if(response.ok == 'ASSEMBLY_EXECUTING'){
          callback(null);
        }
      }
      else{
        callback('error');
      }
    });
  });
}

function notify(assemblyId){
  request.post('http://127.0.0.1:9999/transloadit', {
    form: {
      transloadit: '{"assembly_id": "'+assemblyId+'"}'
    }
  });
}

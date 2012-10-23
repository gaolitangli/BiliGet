#!/bin/env node

var http = require('http'),
    xml2js = require('xml2js'),
    zlib = require('zlib'),
    fs = require('fs'),
    url = require('url'),
    mime = require('./mime').types;

function regexId(string) {
    var result = /flashvars="([^"]+)"/.exec(string);
    if(!result) {
        result = /secure,([^"]+)"/.exec(string);
    }
    return result ? result[1] : null;
}

function getId(pageUrl, cb) {
    var options = url.parse(pageUrl);

    try {
        http.get(options, function(res) {
            var headers = res.headers;

            if(headers.location) {

                pageUrl = headers.location;
                options = url.parse(pageUrl);

                http.get(options, function(res) {
                    var gunzip = zlib.createGunzip();

                    res.pipe(gunzip);

                    var html = '';

                    gunzip.on('data', function(data) {
                        html += data;
                    });

                    gunzip.on('end', function() {
                        var id = regexId(html);
                        cb(id);
                    });

                    gunzip.on('error', function(err) {
                        cb();
                    });

                });

            } else {
                var gunzip = zlib.createGunzip();

                res.pipe(gunzip);

                var html = '';

                gunzip.on('data', function(data) {
                    html += data;
                });

                gunzip.on('end', function() {
                    var id = regexId(html);
                    cb(id);
                });

                gunzip.on('error', function(err) {
                    cb();
                });
            }
        });
    } catch(err) {
        cb();
    }
}

function getURL(id, cb) {
    var pageUrl = 'http://interface.bilibili.tv/playurl?' + id;
    var options = url.parse(pageUrl);

    try {
        http.get(options, function(res) {
            res.setEncoding('utf8');

            var xml_raw = '';
            res.on('data', function(data) {
                xml_raw += data;
            });

            res.on('end', function() {
                var parser = new xml2js.Parser();
                parser.parseString(xml_raw, function(err, result) {
                    if(err) {
                        cb(null);
                    } else {
                        var list_url = [];
                        for(var i in result.video.durl) {
                            list_url.push(result.video.durl[i].url[0]);
                        }
                        cb(list_url);
                    }
                });
            });

            res.on('error', function(err) {
                cb();
            });

        });
    } catch(err) {
        cb();
    }
}

var template = fs.readFileSync('template.html');

var server = new http.Server();

server.on('request', function(req, res) {

    var get = url.parse(req.url, true);
    if(get.pathname == '/') {
        if('url' in get.query) {
            get.query.url = get.query.url.trim();
            if(get.query.url) {
                getId(get.query.url, function(id) {
                    getURL(id, function(list) {
                        if(list) {
                            res.writeHead(200, {
                                'Content-Type': mime['json']
                            });
                            res.end(JSON.stringify(list));
                        } else {
                            res.writeHead(404, {
                                'Content-Type': mime['json']
                            });
                            res.end();
                        }
                    });
                });
            } else {
                res.writeHead(404, {
                    'Content-Type': mime['json']
                });
                res.end();
            }
        } else {
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.write(template);
            res.end();
        }
    } else {
        var pathStatic = /\/static\/([\w]+).([\w]+)/.exec(get.pathname);
        if(pathStatic) {
            var file_name = pathStatic[1],
                file_type = pathStatic[2];
            res.writeHead(200, {
                'Content-Type': mime[file_type],
                'Cache-Control': 'max-age=604800'
            });
            fs.readFile('static/' + file_name + '.' + file_type, 'binary', function(err, data) {
                if(!err) {
                    res.write(data, 'binary');
                }
                res.end();
            });
        } else {
            res.writeHead(404, {
                'Content-Type': 'text/html'
            });
            res.end('Σ( ° △ °|||');
        }
    }

});

server.listen(80);

process.on('uncaughtException', function(err) {
    fs.open('exception.log', 'a', 766, function(e, id) {
        fs.write(id, err + '\n', null, 'utf8', function() {
            fs.close(id);
        });
    });
});
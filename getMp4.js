#!/bin/env node

var http = require('http'),
    url = require('url');

function getMp4(pageUrl, cb) {
	var id = /av(\d+)/.exec(pageUrl)[1];
	var options = url.parse('http://www.bilibili.tv/m/html5?aid=' + id);
	http.get(options, function(res) {
		res.setEncoding('utf8');

		var json_string = '';

		res.on('data', function(data) {
			json_string += data;
		});

		res.on('end', function() {
			cb(JSON.parse(json_string).src);
		});

		res.on('error', function(err) {
			cb(err);
		});

	});
}

getMp4('http://www.bilibili.tv/video/av385750/', function(result) {
	console.log(result);
});
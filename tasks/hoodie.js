/*
 * grunt-hoodie
 * https://github.com/ro-ka/grunt-hoodie
 *
 * Copyright (c) 2013 Robert Katzki
 * Licensed under the MIT license.
 */

var fs = require('fs');
var path = require('path');
var fork = require('child_process').fork;
var kill = require('tree-kill');

// hoodie server start script.
var bin = path.resolve('node_modules/hoodie-server/bin/start');

module.exports = function (grunt) {

  'use strict';

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  // This task only starts a single hoodie server. We will keep a reference to
  // the child process here.
  var child;

  // Flag indicating whether we are already in the process of killing the child.
  var killed;

  // Kill child process (hoodie server)
  function killChild() {
    if (!child || killed) { return; }
    killed = true;
    kill(child.pid, 'SIGTERM');
    grunt.log.ok('Killed ' + child.name + '.');
  }

  // Kill parent process, but killing hoodie server's child process first.
  function killParent() {
    killChild();
    process.exit(0);
  }

  // Intercept parent process' events.
  process.once('SIGINT', killParent);
  process.once('SIGTERM', killParent);
  process.once('uncaughtException', function (err) {
    killChild();
    throw err;
  });

  // Start the hoodie server.
  function start(options, done) {
    var args = [];
    if (options.www) {
      args = [ '--www', options.www ];
    }

    child = fork(bin, args, { silent: true });
    child.name = 'hoodie (pid: ' + child.pid + ')';

    child.once('message', function (msg) {
      options.callback(msg);
      grunt.log.ok(child.name + ' is ready!');
      done();
    });

    child.once('error', function (err) {
      grunt.log.error(err);
    });
    child.once('exit', function (code, signal) {
      grunt.log.warn(child.name + ' exited. Code: ' + code + ' / Signal: ' + signal);
    });
    child.stderr.on('data', function (buf) {
      grunt.log.error(buf);
    });
  }

  // Stop the hoodie server.
  function stop(options, done) {
    killChild();
    done();
  }

  grunt.registerMultiTask('hoodie', 'Start/stop hoodie.', function () {
    var done = this.async();
    var options = this.options({ callback: function () {} });

    switch (this.target) {
      case 'start':
        start(options, done);
        break;
      case 'stop':
        stop(options, done);
        break;
      default:
        grunt.log.error('Unkown target! It must be either "start" or "stop".');
        return done(false);
    }
  });

};

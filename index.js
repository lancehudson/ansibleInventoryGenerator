(function() {
  'use strict';

  /* Globals */
  var AWS   = require('aws-sdk');
  var async = require('async');
  var _     = require('underscore');

  /* Config */
  var region = process.env.AWS_REGION || 'us-west-1';

  /* Objects */
  var ec2 = new AWS.EC2({region: region});

  /* Functions */
  async.waterfall([
    // Get EC2 Info
    function(callback) {
      ec2.describeInstances(callback);
    },
    // Parse Instances
    function(data, callback) {
      callback(null, _.flatten(data.Reservations.map(function(reservation) {
        return reservation.Instances;
      })));
    },
    // Build Hosts List
    function(instances, callback) {
      callback(null, instances.map(function(instance) {
        var tags = _.object(instance.Tags.map(function(tag) {
          return [tag.Key, tag.Value];
        }));

        var config = {
          Host: tags.Name || instance.InstanceId,
          Env: tags.Env || 'EC2',
          Service: tags.Service || 'unknown',
        };

        return config;
      }));
    },
    // Filter List
    function(config, callback) {
      callback(null, config.filter(function(host) {
        return host.Host && host.Env && host.Service;
      }));
    },
  ], function(err, config) {
    if (err) { console.error(err); }
    config = _.sortBy(config, 'Host');
    var hosts = _.groupBy(config, 'Env');
    console.log('### Generated Ansible Inventory from AWS ###');
    console.log('## Env: ' + JSON.stringify(_.countBy(config, 'Env')));
    console.log('## Services: ' + JSON.stringify(_.countBy(config, 'Service')));
    console.log();

    _.keys(hosts).forEach(function(env) {
      hosts[env] = _.groupBy(hosts[env], 'Service');
    });
    // Output hosts
    _.keys(hosts).sort().forEach(function(env) {
      console.log('## ' + env + ' Services ##');
      _.keys(hosts[env]).sort().forEach(function(service) {
        console.log('[' + env.toLowerCase() + '-' +
          service.toLowerCase() + ']');
        hosts[env][service].forEach(function(host) {
          console.log(host.Host);
        });
        console.log();
      });
    });

    // Output Environments
    console.log('## Environments ##');
    _.keys(hosts).sort().forEach(function(env) {
      console.log('[' + env.toLowerCase() + ':children]');
      _.keys(hosts[env]).sort().forEach(function(service) {
        console.log(env.toLowerCase() + '-' + service.toLowerCase());
      });
      console.log();
    });

    // Output Services
    var services = _.groupBy(config, 'Service');
    _.keys(services).forEach(function(service) {
      services[service] = _.groupBy(services[service], 'Env');
    });

    console.log('## Services ##');
    _.keys(services).sort().forEach(function(service) {
      console.log('[' + service.toLowerCase() + ':children]');
      _.keys(services[service]).sort().forEach(function(env) {
        console.log(env.toLowerCase() + '-' + service.toLowerCase());
      });
      console.log();
    });
  });
}());

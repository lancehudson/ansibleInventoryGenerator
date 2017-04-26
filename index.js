(function() {
  'use strict';

  /* Globals */
  var AWS   = require('aws-sdk');
  var async = require('async');
  var _     = require('underscore');

  /* Config */
  var regions = ['us-west-2', 'us-east-1', 'eu-west-1', 'ap-southeast-2'];

  /* Functions */
  async.map(regions, function(region, done) {
    var ec2 = new AWS.EC2({region: region});
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
            Region: region
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
    ],
      // Return results
      done
    );
  },
  function(err, results) {
    if (err) { console.error(err); }
    var config = [].concat.apply([], results);
    config = _.sortBy(config, 'Host');
    var hosts = _.groupBy(config, 'Env');
    console.log('### Generated Ansible Inventory from AWS ###');
    console.log('## Env: ' + JSON.stringify(_.countBy(config, 'Env')));
    console.log('## Services: ' + JSON.stringify(_.countBy(config, 'Service')));
    console.log('## Regions: ' + JSON.stringify(_.countBy(config, 'Region')));
    console.log();

    _.keys(hosts).forEach(function(env) {
      hosts[env] = _.groupBy(hosts[env], 'Service');
      _.keys(hosts[env]).forEach(function(service) {
        hosts[env][service] = _.groupBy(hosts[env][service], 'Region');
      });
    });
    // Output hosts
    _.keys(hosts).sort().forEach(function(env) {
      console.log('## ' + env + ' Services ##');
      _.keys(hosts[env]).sort().forEach(function(service) {
        _.keys(hosts[env][service]).sort().forEach(function(region) {
          console.log('[' + env.toLowerCase() + '-' +
            service.toLowerCase() + '-' +
            region.toLowerCase() + ']');
          hosts[env][service][region].forEach(function(host) {
            console.log(host.Host);
          });
          console.log();
        });
      });
    });

    // Output Environments
    var regions_byEnv = _.groupBy(config, 'Region');
    _.keys(regions_byEnv).forEach(function(region) {
      regions_byEnv[region] = _.groupBy(regions_byEnv[region], 'Env');
      _.keys(regions_byEnv[region]).forEach(function(env) {
        regions_byEnv[region][env] = _.groupBy(regions_byEnv[region][env], 'Service');
      });
    });

    console.log('## env-region ##');

    _.keys(regions_byEnv).sort().forEach(function(region) {
      _.keys(regions_byEnv[region]).sort().forEach(function(env) {
        console.log('[' + env.toLowerCase() + '-' + region.toLowerCase() + ':children]');
        _.keys(regions_byEnv[region][env]).sort().forEach(function(service) {
          console.log(env.toLowerCase() + '-' + service.toLowerCase() + '-' + region.toLowerCase());
        });
      });
      console.log();
    });

    var services_byEnv = _.groupBy(config, 'Service');
    _.keys(services_byEnv).forEach(function(service) {
      services_byEnv[service] = _.groupBy(services_byEnv[service], 'Env');
      _.keys(services_byEnv[service]).forEach(function(env) {
        services_byEnv[service][env] = _.groupBy(services_byEnv[service][env], 'Region');
      });
    });

    console.log('## env-service ##');

    _.keys(services_byEnv).sort().forEach(function(service) {
      _.keys(services_byEnv[service]).sort().forEach(function(env) {
        console.log('[' + env.toLowerCase() + '-' + service.toLowerCase() + ':children]');
        _.keys(services_byEnv[service][env]).sort().forEach(function(region) {
          console.log(env.toLowerCase() + '-' + service.toLowerCase() + '-' + region.toLowerCase());
        });
      });
      console.log();
    });

    console.log('## Environments ##');
    _.keys(hosts).sort().forEach(function(env) {
      console.log('[' + env.toLowerCase() + ':children]');
      _.keys(hosts[env]).sort().forEach(function(service) {
        _.keys(hosts[env][service]).sort().forEach(function(region) {
          console.log(env.toLowerCase() + '-' +
            service.toLowerCase() + '-' +
            region.toLowerCase());
        });
      });
      console.log();
    });

    // Output Services
    console.log('## service-region ##');
    var services_byRegion = _.groupBy(config, 'Service');
    _.keys(services_byRegion).forEach(function(service) {
      services_byRegion[service] = _.groupBy(services_byRegion[service], 'Region');
      _.keys(services_byRegion[service]).forEach(function(region) {
        services_byRegion[service][region] = _.groupBy(services_byRegion[service][region], 'Env');
      });
    });

    _.keys(services_byRegion).sort().forEach(function(service) {
      _.keys(services_byRegion[service]).sort().forEach(function(region) {
        console.log('[' + service.toLowerCase() + '-' + region.toLowerCase() + ':children]');
        _.keys(services_byRegion[service][region]).sort().forEach(function(env) {
          console.log(env.toLowerCase() + '-' + service.toLowerCase() + '-' + region.toLowerCase());
        });
      });
      console.log();
    });

    console.log('## Services ##');
    _.keys(services_byRegion).sort().forEach(function(service) {
      console.log('[' + service.toLowerCase() + ':children]');
      _.keys(services_byRegion[service]).sort().forEach(function(region) {
        _.keys(services_byRegion[service][region]).sort().forEach(function(env) {
          console.log(env.toLowerCase() + '-' + service.toLowerCase() + '-' + region.toLowerCase());
        });
      });
      console.log();
    });

    // Output Regions
    var regions = _.groupBy(config, 'Region');
    _.keys(regions).forEach(function(region) {
      regions[region] = _.groupBy(regions[region], 'Service');
      _.keys(regions[region]).forEach(function(service) {
        regions[region][service] = _.groupBy(regions[region][service], 'Env');
      });
    });

    console.log('## Regions ##');
    _.keys(regions).sort().forEach(function(region) {
      console.log('[' + region.toLowerCase() + ':children]');
      _.keys(regions[region]).sort().forEach(function(service) {
        _.keys(regions[region][service]).sort().forEach(function(env) {
          console.log(env.toLowerCase() + '-' + service.toLowerCase() + '-' + region.toLowerCase());
        });
      });
      console.log();
    });

  });
}());

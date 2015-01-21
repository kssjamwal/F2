module.exports = function(grunt) {

  var exec = require('child_process').exec;
  var handlebars = require('handlebars');
  var moment = require('moment');
  var pkg = grunt.file.readJSON('package.json');
  var semver = require('semver');
  var path = require('path');

  // TODO: Remove Handlebars dependency and use the built-in grunt templating
  handlebars.registerHelper('if', function(conditional, options) {
    if (options.hash.desired === options.hash.test) {
      return options.fn(this);
    }
  });

  grunt.initConfig({
    browserify: {
      options: {
        alias: []
      },
      dist: {
        dest: 'dist/f2.debug.js',
        standalone: 'F2',
        src: ['src/lib/index.js']
      },
      noVendor: {
        dest: 'dist/f2.no-third-party.js',
        src: ['src/lib/index.js'],
        options: {
          exclude: ['jquery', 'eventemitter2', 'bootstrap-modal', 'easyxdm']
        }
      },
      noJqueryBootstrap: {
        dest: 'dist/packages/f2.no-jquery-or-bootstrap.js',
        src: ['src/lib/index.js'],
        options: {
          exclude: ['jquery', 'bootstrap-modal']
        }
      },
      noBootstrap: {
        dest: 'dist/packages/f2.no-bootstrap.js',
        src: ['src/lib/index.js'],
        options: {
          exclude: ['bootstrap-modal']
        }
      },
      noEasyxdm: {
        dest: 'dist/packages/f2.no-easyXDM.js',
        src: ['src/lib/index.js'],
        options: {
          exclude: ['easyxdm']
        }
      },
      basic: {
        dest: 'dist/packages/f2.basic.js',
        src: ['src/lib/index.js'],
        options: {
          exclude: ['easyxdm', 'jquery', 'bootstrap-modal']
        }
      }
    },
    clean: {
      'github-pages': {
        options: {
          force: true
        },
        src: ['../gh-pages/src']
      },
      'F2-examples': {
        options: {
          force: true
        },
        src: ['./F2-examples.zip']
      }
    },
    compress: {
      main: {
        options: {
          archive: 'F2-examples.zip',
          pretty: true
        },
        files: [{
          expand: true,
          cwd: 'examples/',
          src: ['**'],
          dest: 'examples/'
        }, {
          expand: true,
          cwd: 'dist/',
          src: ['f2.debug.js'],
          dest: 'dist/'
        }, {
          expand: true,
          src: ['tests/require.min.js'],
          dest: 'dist/'
        }]
      }
    },
    concat: {
      options: {
        process: {
          data: pkg
        },
        separator: '\n',
        stripBanners: false
      },
      dist: {
        src: [
          'src/lib/template/header.js.tmpl',
          'dist/f2.debug.js',
          'src/lib/template/footer.js.tmpl'
        ],
        dest: 'dist/f2.debug.js'
      },
      'no-third-party': {
        src: [
          'src/lib/template/header.js.tmpl',
          'dist/f2.no-third-party.js',
          'src/lib/template/footer.js.tmpl'
        ],
        dest: 'dist/f2.no-third-party.js'
      },
      'no-jquery-or-bootstrap': {
        src: [
          'src/lib/template/header.js.tmpl',
          'dist/packages/f2.no-jquery-or-bootstrap.js',
          'src/lib/template/footer.js.tmpl'
        ],
        dest: 'dist/packages/f2.no-jquery-or-bootstrap.js'
      },
      'no-bootstrap': {
        src: [
          'src/lib/template/header.js.tmpl',
          'dist/packages/f2.no-bootstrap.js',
          'src/lib/template/footer.js.tmpl'
        ],
        dest: 'dist/packages/f2.no-bootstrap.js'
      },
      'no-easyXDM': {
        src: [
          'src/lib/template/header.js.tmpl',
          'dist/packages/f2.no-easyXDM.js',
          'src/lib/template/footer.js.tmpl'
        ],
        dest: 'dist/packages/f2.no-easyXDM.js'
      },
      // Reminiscent of F2 1.0, no secure apps and Container Provide must have jQuery & Bootstrap on page before F2.
      'basic': {
        src: [
          'src/lib/template/header.js.tmpl',
          'dist/packages/f2.basic.js',
          'src/lib/template/footer.js.tmpl'
        ],
        dest: 'dist/packages/f2.basic.js'
      }
    },
    copy: {
      'github-pages': {
        files: [{
          expand: true,
          cwd: 'docs/',
          src: ['**'],
          dest: '../gh-pages'
        }, {
          expand: true,
          cwd: 'dist/',
          src: ['f2.latest.js'],
          rename: function(dest, src) {
            return '../gh-pages/js/f2.min.js'; //See #35
          }
        }]
      },
      'F2-examples': {
        files: [{
          expand: true,
          cwd: './',
          src: ['F2-examples.zip'],
          dest: '../gh-pages'
        }]
      }
    },
    eslint: {
      options: {
        config: '.eslintrc'
      },
      target: [
        './src/lib/*.js',
        './examples/apps/JavaScript/CDS/**/*.js'
      ]
    },
    /**
      Need to downgrade forever-monitor to v1.1 because of:
      https://github.com/blai/grunt-express/issues/12
      cd node_modules/grunt-express; npm uninstall forever-monitor; npm install forever-monitor@1.1;
    */
    express: {
      server: {
        options: {
          bases: './',
          port: 8080,
          server: (require('path')).resolve('./tests/server')
        }
      }
    },
    http: {
      getDocsLayout: {
        options: {
          url: 'http://www.openf2.org/api/layout/docs',
          json: true,
          strictSSL: false,
          callback: function(err, res, response) {
            var log = grunt.log.write('Retrieved doc layout...')
            grunt.config.set('docs-layout', response);
            log.ok();
            log = grunt.log.write('Saving templates as HTML...');
            // Save as HTML for gen-docs step
            grunt.file.write('./docs/src/template/head.html', response.head);
            grunt.file.write('./docs/src/template/nav.html', response.nav);
            grunt.file.write('./docs/src/template/footer.html', response.footer);
            log.ok();
          }
        }
      }
    },
    jasmine: {
      'non-amd': {
        options: {
          host: 'http://localhost:8080/tests/',
          outfile: 'index.html'
        }
      },
      'amd': {
        options: {
          host: 'http://localhost:8080/tests/',
          outfile: 'index-amd.html'
        }
      }
    },
    pkg: pkg,
    sourcemap: {
      options: {
        src: 'dist/f2.min.js',
        prefix: './dist/'
      }
    },
    uglify: {
      options: {
        preserveComments: 'some',
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("mm-dd-yyyy") %> - See below for copyright and license */\n'
      },
      dist: {
        files: {
          'dist/f2.min.js': ['dist/f2.debug.js']
        },
        options: {
          report: 'gzip'
        }
      },
      sourcemap: {
        files: '<%= uglify.dist.files %>',
        options: {
          sourceMap: function(fileName) {
            return fileName.replace(/\.js$/, '.js.map');
          },
          sourceMapPrefix: 1,
          sourceMappingURL: function(path) {
            return path.replace(grunt.config('sourcemap.options.prefix'), '').replace(/\.js$/, '.js.map');
          }
        }
      },
      'package-no-jquery-or-bootstrap': {
        files: {
          'dist/packages/f2.no-jquery-or-bootstrap.min.js': ['dist/packages/f2.no-jquery-or-bootstrap.js']
        },
        options: {
          report: 'gzip'
        }
      },
      'package-no-bootstrap': {
        files: {
          'dist/packages/f2.no-bootstrap.min.js': ['dist/packages/f2.no-bootstrap.js']
        },
        options: {
          report: 'gzip'
        }
      },
      'package-no-easyXDM': {
        files: {
          'dist/packages/f2.no-easyXDM.min.js': ['dist/packages/f2.no-easyXDM.js']
        },
        options: {
          report: 'gzip'
        }
      },
      'package-basic': {
        files: {
          'dist/packages/f2.basic.min.js': ['dist/packages/f2.basic.js']
        },
        options: {
          report: 'gzip'
        }
      }
    },
    watch: {
      docs: {
        files: ['docs/src/**/*.*', 'package.json', 'docs/bin/gen-docs.js'],
        tasks: ['docs'],
        options: {
          spawn: false
        }
      },
      scripts: {
        files: ['./src/lib/**/*.js'],
        tasks: ['js'],
        options: {
          spawn: false
        }
      },
      lint: {
        files: [
          './src/lib/**/*.js',
          './examples/apps/JavaScript/**/*.js'
        ],
        tasks: ['lint'],
        options: {
          spawn: false
        }
      }
    }
  });

  // Load plugins
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-express');
  grunt.loadNpmTasks('grunt-http');

  // Register tasks
  grunt.registerTask('default', ['test', 'js', 'docs', 'zip']);
  grunt.registerTask('docs', ['http', 'generate-docs', 'yuidoc']);
  grunt.registerTask('fix-sourcemap', 'Fixes the source map file', taskFixSourcemaps);
  grunt.registerTask('generate-docs', 'Generate docs', taskGenerateDocs);
  grunt.registerTask('github-pages', ['copy:github-pages', 'clean:github-pages']);
  grunt.registerTask('js', ['lint', 'browserify', 'concat:dist', 'concat:no-third-party', 'uglify:dist', 'sourcemap']);
  grunt.registerTask('lint', ['eslint']);
  grunt.registerTask('nuget', 'Builds the NuGet package for distribution on NuGet.org', taskNuget);
  grunt.registerTask('packages', [
    'concat:no-jquery-or-bootstrap',
    'concat:no-bootstrap',
    'concat:no-easyXDM',
    'concat:basic',
    'uglify:package-no-jquery-or-bootstrap',
    'uglify:package-no-bootstrap',
    'uglify:package-no-easyXDM',
    'uglify:package-basic'
  ]);
  grunt.registerTask('release', 'Prepares the code for release (merge into master)', taskRelease);
  grunt.registerTask('sourcemap', ['uglify:sourcemap', 'fix-sourcemap']);
  grunt.registerTask('test', ['express', 'jasmine']);
  grunt.registerTask('test-live', ['express', 'express-keepalive']);
  grunt.registerTask('travis', ['test']);
  grunt.registerTask('version', 'Displays version information for F2', taskVersion);
  grunt.registerTask('yuidoc', 'Builds the reference docs with YUIDocJS', taskYuiDoc);
  grunt.registerTask('zip', ['compress', 'copy:F2-examples', 'clean:F2-examples']);

  function taskFixSourcemaps() {
    var uglifyOptions = grunt.config('uglify.sourcemap.options');
    var options = grunt.config('sourcemap.options');
    var dest = uglifyOptions.sourceMap(options.src);
    var rawMap = grunt.file.read(dest);

    rawMap = rawMap.replace(options.prefix, '');
    grunt.file.write(dest, rawMap);
  }

  function taskGenerateDocs() {
    var done = this.async();
    var log = grunt.log.write('Generating docs...');

    exec('node ' + path.join(__dirname, 'docs/bin/gen-docs'), function(err, stdout, stderr) {
      if (err) {
        grunt.log.error(err.message);
        grunt.fail.fatal('Docs generation aborted.');
        return;
      }
      grunt.log.write(stdout);
      log.ok();
      done();
    });
  }

  function taskNuget() {
    var done = this.async();
    var log = grunt.log.write('Creating NuSpec file...');
    var nuspec = grunt.file.read('./dist/f2.nuspec.tmpl');

    nuspec = grunt.template.process(nuspec, { data: pkg });
    grunt.file.write('./dist/f2.nuspec', nuspec);
    log.ok();

    log = grunt.log.write('Creating NuGet package...');
    grunt.util.spawn({
      cmd: 'nuget',
      args: ['pack', 'f2.nuspec'],
      opts: {
        cwd: './dist'
      }
    }, function(error, result, code) {
      if (error) {
        grunt.fail.fatal(error);
      } else {
        grunt.file.delete('./dist/f2.nuspec');
        log.ok();
        done();
      }
    });
  }

  function taskRelease(releaseType) {
    if (!/^major|minor|patch$/i.test(releaseType) && !semver.valid(releaseType)) {
      grunt.log.error('"' + releaseType + '" is not a valid release type (major, minor, or patch) or SemVer version');
      return;
    }

    pkg.version = semver.valid(releaseType) ? releaseType : String(semver.inc(pkg.version, releaseType)).replace(/\-\w+$/, '');
    pkg._releaseDate = new Date().toJSON();
    pkg._releaseDateFormatted = moment(pkg._releaseDate).format('D MMMM YYYY');

    grunt.file.write('./package.json', JSON.stringify(pkg, null, '\t'));
    grunt.config.set('pkg', pkg);

    grunt.task.run('version');
  }

  function taskVersion() {
    grunt.log.writeln(grunt.template.process(
      'This copy of F2 is at version <%= version %> with a release date of <%= _releaseDateFormatted %>',
      { data: pkg }
    ));
  }

  function taskYuiDoc() {
    var builder;
    var docOptions = {
      quiet: true,
      norecurse: true,
      paths: ['./src/lib'],
      outdir: './docs/dist/sdk/',
      themedir: './docs/src/sdk-template',
      helpers: ['./docs/src/sdk-template/helpers/helpers.js']
    };
    var done = this.async();
    var log = grunt.log.write('Generating reference docs...');
    var Y = require('yuidocjs');

    var json = (new Y.YUIDoc(docOptions)).run();
    // Massage in some meta information from F2.json
    json.project = {
      docsAssets: '../',
      version: pkg.version,
      releaseDateFormatted: pkg._releaseDateFormatted
    };
    docOptions = Y.Project.mix(json, docOptions);

    // Ensures that the class has members and isn't just an empty namespace
    // Used in sidebar.handlebars
    Y.Handlebars.registerHelper('hasClassMembers', function() {
      for (var i = 0, len = json.classitems.length; i < len; i++) {
        if (json.classitems[i].class === this.name) {
          return '';
        }
      }

      return 'hidden';
    });

    builder = new Y.DocBuilder(docOptions, json);
    builder.compile(function() {
      log.ok();
      done();
    });
  }

};

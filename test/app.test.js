var chai   = require('chai');
var should = chai.should();
var assert = chai.assert;
var AppIo  = require('../index');

var appio;
before(function (done) {
    this.timeout(0);
    
    appio = new AppIo({
        basedir: __dirname,
        test: true
    }).run(function() {
        done();
    });
});

after(function (done) {
    this.timeout(0);
    done();
});

describe('app',function() {
    this.timeout(0);

    it('should have properties',function(done) {
        assert.deepProperty(appio, '_app.config');
        assert.deepProperty(appio, '_app.system');
        assert.deepProperty(appio, '_app.lib');
        assert.deepProperty(appio, '_app.boot');
        assert.deepProperty(appio, '_app.core');
        assert.deepProperty(appio, '_app.libpost');
        assert.deepProperty(appio, '_app.middle');
        assert.deepProperty(appio, '_app.model');
        done();
    });    

});

/**
 * @TODO
 * tests, tests, tests, more tests...
 */
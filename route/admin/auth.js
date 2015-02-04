module.exports = function(app) {

    app.get('/admin/login', app.lib.auth.loginForm);
    app.post('/admin/login', app.lib.auth.login);
    app.get('/admin/logout', app.lib.auth.logout);

};
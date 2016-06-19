module.exports = {

    api: {
        query: {
            lean: true
        },
        token: {
            secret: 'bx9cazd3uetbimX29umieDF1vwuCANwJ',
            expires: 60
        },
        admin: {
            user: {
                name: 'Super Admin',
                email: 'super@admin.com',
                password: '123456',
                type: 'A'
            }
        }
    },

    apps: {
        list: [
            {name: 'System', slug: 'system', long: 'System'},
            {name: 'Testapp', slug: 'testapp', long: 'Test App'}
        ]
    },

    auth: {
        testapp: {
            '/api/login': false,
            '/api/token': false,
            '/api/forgot': false,
            '/api/invite': false,
            '/api/invite/:token': false,
            '/api/register': false,
            '/api/resend': false,
            '/api/change_password': false,
            '/api/social': false,
            '/api/waiting/accept': false,
            '/api/waiting/decline': false,
            '/api/waiting/line': false,

            register: {
                username: 'required|min:2|max:20|alpha_num',
                password: 'required|min:4|max:20',
                no_email_verify: true
            },
            auth: {
                invite_moderation: false,
                invite_expires: 7,
                waiting_list: false
            }
        }
    },

    data: {
        mongo: {
            host: '127.0.0.1',
            port: 27017,
            db: 'appio_test',
            pool: 10,
            autoIndex: true,
            debug: false
        },
        redis: {
            host: '127.0.0.1',
            port: 6379
        }
    },

    logger: {
        transport: 'Console',
        options: {
            level: 'debug',
            humanReadableUnhandledException: true,
            handleExceptions: true,
            json: false,
            colorize: false,
            prettyPrint: false,
            showLevel: false,
            timestamp: false
        }
    },

    boot: {
        body: {
            urlencoded: {
                extended: true,
                limit: '16mb'
            },
            json: {
                limit: '16mb'
            }
        },
        compress:{},
        cookie: {},
        favicon: {
            fileName: 'favicon.ico'
        },
        session: {
            name: 'appio.sid',
            secret: 'dVzxlqhr2tqEfK9kcFNSkB0Gqx9XEs2z',
            cookie: {
                maxAge: 604800000
            },
            resave: false,
            saveUninitialized: true
        },
        'static': {
            dir: 'public',
            options: {
                maxAge: '1d'
            }
        },
        view: {
            dir: 'view',
            swig: {
                cache: false
            }
        }
    },

    sync: {
        data: {
            apps: false,
            roles: false,
            objects: false,
            superadmin: false,
            actions: false,
            userroles: false,
            docs: false,
            superacl: false,
            core: false
        },
        random: {
            model_name: false
        },
        denormalize: {
            model_name: false
        },
        index: {
            system_locations: false
        },
        locations: {
            autoindex: false
        }
    },

    roles: {
        system: {
            'default': [
                {name: 'Superadmin', slug: 'superadmin'}
            ]
        },
        testapp: {
            'default': [
                {name: 'Admin', slug: 'admin'},
                {name: 'User', slug: 'user'}
            ],
            actions: {
                admin: {

                },
                user: {

                }
            }
        }
    }

};
<h1 align="center">app.io</h1>  

<div align="center">
  <strong>REST API and web application framework, built on Nodejs, Express, and Mongoose</strong>
</div>

<br />

<div align="center">
  <!-- NPM version -->
  <a href="https://npmjs.org/package/app.io" target="_blank">
    <img src="https://img.shields.io/npm/v/app.io.svg" alt="NPM version" />
  </a>
  <!-- License -->
  <a href="https://npmjs.org/package/app.io" target="_blank">
    <img src="https://img.shields.io/npm/l/app.io.svg" alt="License" />
  </a>  
  <!-- Downloads -->
  <a href="https://npmjs.org/package/app.io" target="_blank">
    <img src="https://img.shields.io/npm/dt/app.io.svg" alt="Downloads" />
  </a>  
  <!-- Downloads Month -->
  <a href="https://npmjs.org/package/app.io" target="_blank">
    <img src="https://img.shields.io/npm/dm/app.io.svg" alt="Downloads Month" />
  </a>  
  <!-- Travis CI -->
  <a href="https://travis-ci.org/selcukfatihsevinc/app.io" target="_blank">
    <img src="https://img.shields.io/travis/selcukfatihsevinc/app.io.svg" alt="Travis CI" />
  </a>    
  <!-- Dependencies -->
  <a href="https://david-dm.org/selcukfatihsevinc/app.io" target="_blank">
    <img src="https://img.shields.io/david/selcukfatihsevinc/app.io.svg" alt="Dependencies" />
  </a>
  <!-- Github Stars -->
  <a href="https://github.com/selcukfatihsevinc/app.io" target="_blank">
    <img src="https://img.shields.io/github/stars/selcukfatihsevinc/app.io.svg?label=%E2%98%85" alt="Github Stars" />
  </a>       
</div>

<br />

```app.io``` is an open source ```REST API``` and web application framework, built on ```Nodejs```, ```Express```, and ```Mongoose```,   
which is simple, easy, quick, flexible, extendable and scalable, and which has numerous features and capabilities,  
including a pre-configured server, an auto-generated admin UI and also auto-generated ```REST API``` endpoints.  

```app.io``` is ideal for quick ```REST API``` development.  
It saves you from the complexity of API’s, and helps you to focus on your product and save time.  
Moreover, it enables you to work on multiple projects within the same framework.   

### Why was app.io developed?  

- In order to be used in cases, when a very quick ```REST API``` is needed for mobile-first applications.
- In order to answer the need for a powerful framework that will take on many tasks for you and simplify your work. It does not restrict you with given features, and it does not restrain you from writing your own code.
- In order to provide numerous features in a single framework. For example, you can manage multiple projects. Moreover, ```REST API``` endpoints and admin UI are automatically generated from ```Mongoose``` models.

### What can you do with app.io?

- ```app.io``` installs ```Express``` middlewares you may need, and runs the server. 
- ```app.io``` connects to data sources.
- You can use auto-generated ```REST API``` endpoints and admin UI.
- You can use predefined models, such as apps, users, roles, objects and actions.
- You can use the user authentication endpoints, such as login, register, forgot password, invite and change password.
- You can use the ACL-based user authorization.
- You can use the social authentication.
- You can access the auto-generated API documentation.

#### note:

```app.io``` is under development, so use it at your own risk.

## Table Of Contents
- [Getting Started](#getting-started)
  - [Creating an Application](#creating-an-application)
  - [Directory Structure](#directory-structure)
- [Creating an API](#creating-an-api)
  - [API Endpoints](#api-endpoints)
  - [Creating an Object](#creating-an-object)
  - [Getting Object List](#getting-object-list)
  - [Query Parameters](#query-parameters)
  - [Query Operators](#query-operators)
- [Authenticating Users](#authenticating-users)
  - [Creating Client Key and Client Secret](#creating-client-key-and-client-secret)
  - [Authentication Endpoint Requests](#authentication-endpoint-requests)
  - [Registering Users](#registering-users)
    - [Enabling Authentication Endpoints](#enabling-authentication-endpoints)
  - [Logging in Users](#logging-in-users)
  - [Making Authenticated Requests](#making-authenticated-requests)
- [Other Authentication Endpoints](#other-authentication-endpoints)  
- [Next Steps](#next-steps)
- [Routes](#routes)
- [Configuring an app.io Instance](#configuring-an-app.io-instance)
- [Views](#views)
  - [Static Files](#static-files)
- [API Responses](#api-responses)
- [Detailed Look at ACL](#detailed-look-at-acl)
  - [Master User Level]
- [Models](#models)
  - [Field Options](#field-options)
  - [Model Loader Options](#model-loader-options)
    - [Admin UI Options](#admin-ui-options)
    - [Data Denormalization](#data-denormalization)
    - [Document Owner Protection](#document-owner-protection)
    - [Masking API Data](#masking-api-data)
    - [Reference Counting](#reference-counting)
    - [Field Reference Counting](#field-reference-counting)
    - [Field Size Calculating](#field-size-calculating)
    - [Field Hook Mechanism](#field-hook-mechanism)
  - [Predefined Models](#predefined-models)
    - [System Models]
      - [system.accounts]
      - [system.actions]
      - [system.apps]
      - [system.filters]
      - [system.images]
      - [system.invites]
      - [system.locations]
      - [system.objects]
      - [system.roles]
      - [system.users]
  - [Caching Data]
- [Built-in Middlewares]
  - [Express Middlewares]
  - [app.io Middlewares]
- [Admin UI]
- [Built-in Job Queue]
- [Built-in Cron]
- [Built-in Mailer]
- [Social Authentication]
- [File Uploads]
- [On the Fly Image Resizer]
- [Built-in URL Shortener Service]
- [Built-in RSS Feed Parser]
- [Data Synchronization]
- [Socket.io Support]
- [Oauth]
- [API Documentation]

## Getting Started  

### Creating an Application

The best way of using ```app.io``` is the ```Yeoman``` generator. It generates a basic skeleton for ```app.io``` based application. If you haven't installed ```Yeoman```, install it first.
```
$ npm install -g yo
```

Then install the ```app.io``` generator.
```
$ npm install -g generator-appio
```

Now you can generate ```app.io``` application by using the ```Yeoman``` generator.
```
$ yo appio
```

```
     _-----_  
    |       |    .--------------------------.  
    |--(o)--|    |   Welcome to the AppIo   |  
   `---------´   |        generator!        |  
    ( _´U`_ )    '--------------------------'  
    /___A___\  
     |  ~  |  
   __'.___.'__  
 ´   `  |° ´ Y `  

? Write app name (My App) Test App  
? Write app slug (myapp) testapp  
? Write app description (My App Description) Test App Description  
```

After the generator finishes installation, run the server. Don't forget to start ```Mongodb``` and ```Redis``` before running ```app.io```.
```
$ node app
```

That’s all! Now ```app.io``` is up and running.
Let's look at the ```app.js```.
```js
var AppIo = require('app.io');
new AppIo({basedir: __dirname}).run();
```
With these two lines you have a full featured framework, built on ```Express```.  
```app.io``` is now connected to ```Mongodb``` and ```Redis```, and is using some ```Express``` middlewares you may need,
such as ```body-parser```, ```morgan```, ```cors```, ```swig``` as a template engine, ```compression```, ```static```, ```cookie-parser```,
```express-session``` with ```connect-redis```, ```connect-flash```, ```serve-favicon``` and ```passport```.  

### Directory Structure

Directory structure generated by ```Yeoman```:
```
|--config/
|  Application configuration files. You can configurate middlewares, data source connections, roles, etc. 
|--lib/
|  Custom libraries
|--model/
|  Mongoose models
|--public/
|  Static files (css, js, images, etc.)
|--route/
|  Custom Express routes
|--view/
|  Custom view templates
|--app.js
|  Main script that starts your application
|--flightplan.js
|  Flightplan scripts
|--package.json
|  NPM package file
|--worker.js
|  Main script that starts your Kue workers
```

## Creating an API

To create an ```API```, you can create a ```Mongoose``` model, and your ```REST API``` is ready on the fly. It's so simple!
Create a file under the model directory, ```model/test/posts.js```
```js
module.exports = function(app) {
    var _query    = app.lib.query;
    var _mongoose = app.core.mongo.mongoose;
    var ObjectId  = _mongoose.Schema.Types.ObjectId;
    var Mixed     = _mongoose.Schema.Types.Mixed;
    
    // schema
    var Schema = {
        u  : {type: ObjectId, required: true, ref: 'System_Users', alias: 'users'},
        t  : {type: String, required: true, alias: 'title'},
        b  : {type: String, required: true, alias: 'body'},
        ca : {type: Date, default: Date.now, alias: 'created_at'}
    };

    // settings
    Schema.u.settings  = {label: 'User', display: 'email'};
    Schema.t.settings  = {label: 'Title'};
    Schema.b.settings  = {label: 'Body'};

    // load schema
    var PostSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Test_Posts',
        Options: {
            singular : 'Test Post',
            plural   : 'Test Posts',
            columns  : ['users', 'title', 'body'],
            main     : 'title',
            perpage  : 25
        }
    });

    // plugins
    PostSchema.plugin(_query);

    return _mongoose.model('Test_Posts', PostSchema);
};
```

You have to include external models to an ```app.io``` instance; otherwise, ```app.io``` won't load external sources.
New ```app.js``` is look likes that;
```js
var AppIo = require('app.io');
new AppIo({
    basedir: __dirname,
    verbose: true,
    external: {
        model: ['test'] // includes whole test directory
    }    
}).run();
```

Run ```app.js``` again;
```
$ node app
```

Yeah! Now you have a ```REST API``` for ```test.posts``` model that have sanitisation, validation, authentication, authorization, and much more features.  
You also have an admin UI for this model.    

Have you noticed the structure of ```model/test/posts.js```?
```app.io``` uses ```express-load``` under the hood. 
It loads everything to the app object; thus, you can use ```app.io``` abilities in your external files with dot notation, like this;
```js
module.exports = function(app) {
    // all app.io scripts are available in your external files
    var _mongoose = app.core.mongo.mongoose;
};
```

You have to use the ```Mongoose``` query plugin, ```app.lib.query```, to query ```REST API``` with several operators.  
You have to pass a ```Mongoose``` schema object to ```app.libpost.model.loader.mongoose``` function as a parameter for additional abilities.

### API Endpoints

Now you have a ```REST API``` that listens requests on the following endpoints: 

| Method | Resource              | Description           |                                 
|--------|-----------------------|-----------------------|
| GET    | /api/o/test.posts     | Get a list of objects |
| GET    | /api/o/test.posts/:id | Get a single object   |
| POST   | /api/o/test.posts     | Create a new object   |
| PUT    | /api/o/test.posts/:id | Update an object      |
| DELETE | /api/o/test.posts/:id | Delete an object      |

### Creating an Object

Try to create an object:  
Run ```[POST] http://127.0.0.1:3001/api/o/test.posts```.

Do you see the response? You receive ```403``` response, because ```app.io``` is ACL-ready!
```js
{
  "meta": {
    "name": "Forbidden",
    "code": 403
  }
}
```

Let's allow posting an object for ```test.posts``` model. Go to the admin page; ```http://127.0.0.1:3001/admin```.
You can find basic auth and login cridentials in your config file; ```config/development.js```.
Choose ```Test App``` on admin dashboard and go to the ```System->Actions``` page from the left menu.
In order to create an action for the ```Guest``` user, click on the "+new" button.
Fill in the form. Select ```Guest``` for the ```Role``` field, ```Test Posts``` for the ```Object``` field and ```Post``` for the ```Action``` field.
Try again on your HTTP client.

Do you see the response now? You received ```422``` response, because ```app.io``` has an API validation!
```js
{
  "meta": {
    "name": "UnprocessableEntity",
    "code": 422,
    "message": {
      "type": "ValidationError",
      "errors": [
        {
          "path": "users",
          "message": "is missing and not optional",
          "slug": "required_error"
        },
        {
          "path": "title",
          "message": "is missing and not optional",
          "slug": "required_error"
        },
        {
          "path": "body",
          "message": "is missing and not optional",
          "slug": "required_error"
        }
      ]
    }
  }
}
```

Fill in the parameters and try again. Oh yeah, you received ```201``` response now!  
```ps```: please, look at the system_users collection from Mongodb for a valid user id. 
```js
{
  "meta": {
    "name": "Created",
    "code": 201
  },
  "data": {
    "doc": {
      "_id": "576d9023420ba27f0475cd9b",
      "users": "576bca775c7a8dee2702dddb",
      "title": "title",
      "body": "body",
      "created_at": "2016-06-24T19:55:15.636Z"
    }
  }
}
```

It is so simple! Now you are ready to execute a query on data.

### Getting Object List

In order to get a list of objects, as shown above, you must allow getting objects for the ```test.posts``` model. Edit previous ```System->Actions``` record and add a ```Get``` permission.  
Run ```[GET] http://127.0.0.1:3001/api/o/test.posts```;
```js
{
  "meta": {
    "name": "OK",
    "code": 200
  },
  "data": {
    "doc": [
      {
        "_id": "576d9023420ba27f0475cd9b",
        "users": "576bca775c7a8dee2702dddb",
        "title": "title",
        "body": "body",
        "created_at": "2016-06-24T19:55:15.636Z"
      }
    ]
  }
}
```

You received the objects!   

### Query Parameters

Main query parameters for ```[GET] /api/o/:object``` endpoints are;
 
| Parameter      | Query              | Example                              |
|----------------|--------------------|--------------------------------------|
| **query type** | qt=find            | /api/o/test.model?qt=find            |
| **fields**     | f=field_a,field_b  | /api/o/test.model?f=field_a,field_b  |
| **sort**       | s=field_a,-field_b | /api/o/test.model?s=field_a,-field_b |
| **skip**       | sk=10              | /api/o/test.model?sk=10              |
| **limit**      | l=10               | /api/o/test.model?l=10               |
| **populate**   | p=field_a,field_b  | /api/o/test.model?p=field_a,field_b  |

Other query types for ```[GET] /api/o/:object``` endpoints are;
```find``` ```one``` ```count``` ```findcount``` ```distinct``` ```tree```.

### Query Operators

```[GET] /api/o/:object``` endpoints have a number of operators;

| Filter                       | Query                 | Example                                 |
|------------------------------|-----------------------|-----------------------------------------|
| **equal**                    | key=a                 | /api/o/test.model?key=a                 |
| **not equal**                | key={ne}a             | /api/o/test.model?key={ne}a             |
| **greater than**             | key={gt}a             | /api/o/test.model?key={gt}a             |
| **greater than or equal to** | key={gte}a            | /api/o/test.model?key={gte}a            |
| **less than**                | key={lt}a             | /api/o/test.model?key={lt}a             |
| **less than or equal to**    | key={lte}a            | /api/o/test.model?key={lte}a            |
| **in**                       | key={in}a,b           | /api/o/test.model?key={in}a,b           |
| **not in**                   | key={nin}a,b          | /api/o/test.model?key={nin}a,b          |
| **contains all**             | key={all}a,b          | /api/o/test.model?key={all}a,b          |
| **empty or not exists**      | key={empty}           | /api/o/test.model?key={empty}           |
| **exists and not empty**     | key={!empty}          | /api/o/test.model?key={!empty}          |
| **exists and null**          | key={null}            | /api/o/test.model?key={null}            |
| **near**                     | key={near}lon,lat,max | /api/o/test.model?key={near}lon,lat,max |
| **%like%**                   | key={:like:}a         | /api/o/test.model?key={:like:}a         |
| **like%**                    | key={like:}a          | /api/o/test.model?key={like:}a          |
| **%like**                    | key={:like}a          | /api/o/test.model?key={:like}a          |
| **exists and null**          | key={all}a,b          | /api/o/test.model?key={all}a,b          |
| **between**                  | key={between}a,b      | /api/o/test.model?key={between}a,b      |

## Authenticating Users

We used ```Guest``` user on the examples above. However, we need authenticated users in real life.  
You can use authentication endpoints that are ready in ```app.io```

### Creating Client Id and Client Secret

Before using authentication endpoints, you need a ```Client Id``` and a ```Client Secret```. All authentication endpoints require this information.
Go to the admin page, ```http://127.0.0.1:3001/admin```.
You can find basic auth and login cridentials in your config file, ```config/development.js```.
Choose ```Test App``` on admin dashboard and go to the ```Oauth->Clients``` page from the left menu.
Create a client.
Fill in the ```Name``` field, select ```Test App``` for the ```Apps``` field, and fill in the ```Redirect Uri``` field (```Redirect Uri``` is required, but is not important for now).
If the ```Client Id``` and the ```Client Secret``` fields are empty, ```app.io``` will generate these keys for you.
 
### Authentication Endpoint Requests

Authentication endpoints require a ```Client Id``` and a ```Client Secret```. Get the keys you generated for the ```Test App```, and
send headers as ```X-Client-Id``` and ```X-Client-Secret```.
 
### Registering Users

You can use ```[POST] /api/register``` endpoint to register users.
```email``` and ```password``` fields are required for the minimal configuration.

#### Enabling Authentication Endpoints

Before using authentication endpoints, be sure that you have enabled endpoints in the config file; otherwise, you will receive ```401``` response.
```js
  auth: {
    'test': {
      '/api/register': true,
      ...
    }
  }
```

### Logging in Users

You can use ```[POST] /api/login``` endpoint to login users. Before using this endpoint, don't forget to enable it.
Example response for a login request;
```js
{
  "meta": {
    "name": "OK",
    "code": 200
  },
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE0NzE5OTMxMjE3NzYsInVzZXIiOnsiX2lkIjoiNTc2ZGJhMzY4YzU1NGUyOTA3N2IyMDU4In19.S1uNjX64z3aNIfEukw60bbCdQbHMOLO4Ei6tvvIc1X8",
    "expires": 1471993121776,
    "userId": "576dba368c554e29077b2058",
    "roles": [
      "test_user"
    ],
    "resources": {},
    "profile": false,
    "isEnabled": "Yes",
    "waitingStatus": "Accepted",
    "passwordChanged": "N"
  }
}
```

You will use ```data.token``` for making authenticated requests.

### Making Authenticated Requests

We used ```Guest``` user at all examples above. Now we will try to use ```test.posts``` endpoints with a real user.  
Go to the admin page, ```http://127.0.0.1:3001/admin```, then select the ```System->Actions``` page from the left menu.
Remove the action for the ```Guest``` user, which we had created before.
Now create an action for the ```User``` role.
Fill in the form, select ```User``` for the ```Role``` field, ```Test Posts``` for the ```Object``` field, and ```Get``` and ```Post``` for the ```Action``` field.
We have ```Get``` and ```Post``` permissions for the ```User``` role on the ```test.posts``` model now.  
We have to send a ```X-Access-Token``` header to make authenticated requests. If we don't send this header, we will receive ```403``` response.
```js
{
  "meta": {
    "name": "Forbidden",
    "code": 403
  }
}
```

## Other Authentication Endpoints

```app.io``` has other authentication endpoints you may have need;

| Method | Endpoint             | Description                                          |
|--------|----------------------|------------------------------------------------------|
| GET    | /api/token           | get user data for verified token                     |
| POST   | /api/forgot          | forgot password                                      |
| POST   | /api/reset/:token    | reset your password with forgot password token       |
| POST   | /api/invite          | user invitation                                      |
| POST   | /api/invite/:token   | accept invitation and register with invitation token |
| POST   | /api/verify/:token   | verify user with registration token                  |
| POST   | /api/resend          | resend registration token                            |
| POST   | /api/change_password | change password                                      |
| POST   | /api/social          | social login or register                             |
            
## Next Steps

You have learned the core and the most important concepts of ```app.io```. However, this is yet the tip of the iceberg.
Next, we will learn details about ```app.io```.

## Routes

You know that you can use the app object and other ```app.io``` abilities in your external sources. Adding a new route is simple.   
Create a file under the route directory, ```route/test/posts.js```. Add your route like this;
```js
module.exports = function(app) {
	app.get('/my-route', function(req, res, next) {
		res.json({everything: 'OK'});
	});
};
```

You have to include external routes to an ```app.io``` instance. New ```app.js``` is look likes that;
```js
var AppIo = require('app.io');
new AppIo({
    basedir: __dirname,
    verbose: true,
    external: {
        model: ['test'],
        route: ['test']
    }    
}).run();
```

Run ```[GET] http://127.0.0.1:3001/my-route```;
```js
{
  "everything": "OK"
}
```

## Configuring an app.io Instance

You loaded some external sources to an ```app.io``` instance on the examples above. There are some other options to configure an ```app.io``` instance.

```js
var AppIo = require('app.io');
new AppIo({
    basedir: __dirname,
    cores: 1,
    env: 'production',
    port: 3001,
    verbose: true,
    core: ['mongo', 'redis', 'cache'],
    // boot: 'mailer|override',
    external: {
        boot: 'i18n|gitversion',
        model: ['test'],
        middle: ['test'],
        lib: ['test'],
        route: ['test']
    }    
}).run();
```

```cores```: You can configure the number of ```Node.js``` instances to take advantage of multi-core systems. By default, an ```app.io``` instance uses the maximum number of cpu cores.     
```verbose```: If you want to see the loaded modules, use this option.  
```env```: You can set the environment with this option. You can also use process environment variable if you want; ```NODE_ENV=production```  
```port```: You can set the server's port with this option. You can also use process environment variable if you want; ```NODE_PORT=3001```  
```core```: You can load other data sources with this option. Available options are; ```cache```, ```db```, ```elasticsearch```, ```mongo```, ```redis```, ```solr```.  
```boot```: You can load some extra functionalities that ```app.io``` doesn't load with minimal configuration. Available options are; ```mailer```, ```mailerPool```, ```oauthproxy```, ```override```, ```resize```  
```external```: You can load external sources with this option. Available options are;  ```boot```, ```model```, ```middle```, ```lib```, ```route```  

## Views

Now you have a route file under the route directory; ```route/test/posts.js```. Let's try to render a view in this file. ```app.io``` uses ```Swig``` as a template engine.
By default, ```app.io``` is looking for the ```view``` directory. You can change it from the configuration file; ```config/development.js```.
```js
  boot: {
      view: {
          dir: 'view',
          swig: {
              cache: false
          }
      },
      ...
  }
```

Now our route file looks like this;
```js
module.exports = function(app) {
	app.get('/my-route', function(req, res, next) {
		res.render('test/my-route');
	});
};
```

### Static Files

By default, ```app.io``` is looking for the ```public``` directory to serve static files. You can change it from the configuration file; ```config/development.js```.
```js
  boot: {
	  'static': {
	      dir: 'public',
	      options: {
	          maxAge: '1d'
	      }
	  },
      ...
  }
```

## API Responses

The ```meta``` key is used to give extra information about the response. If the request is succesful and everything is ok, you will receive a ```200``` response with data.
```js
{
  "meta": {
    "name": "OK",
    "code": 200
  },
  "data": {
    ...
  }
}
```

If the data you are looking for is not found, you will receive a ```404``` error response.
```js
{
  "meta": {
    "name": "NotFound",
    "code": 404
  }
}
```

If the data you send to a resource is not valid, you will receive a ```422``` error response.
```js
{
  "meta": {
    "name": "UnprocessableEntity",
    "code": 422,
    "message": {
      "type": "ValidationError",
      "errors": [
        ...
      ]
    }
  }
}
```

If you don't have a proper permission on a resource, or if you don't send a ```X-Access-Token``` header that is required by the resource, you will receive a ```403``` error response.
```js
{
  "meta": {
    "name": "Forbidden",
    "code": 403
  }
}
```

If something is wrong about any authentication endpoint, you will receive a ```401``` error response.
```js
{
  "meta": {
    "name": "Unauthorized",
    "code": 401,
    "message": {
    ...
    }
  }
}
```

If something is wrong about the server, you will receive a ```500``` error response.
```js
{
  "meta": {
    "name": ...,
    "code": 500,
    "message": ...
  }
}
```

You will receive a ```201``` response to a ```POST``` request that results in a creation.
```js
{
  "meta": {
    "name": "Created",
    "code": 201
  },
  "data": {
    "doc": {
		...
    }
  }
}
```

You will receive a ```204 NoContent``` response to a successful request that won't be returning a body (like a ```DELETE``` request).

## Detailed Look at ACL

```app.io``` has an ```ACL (Access Control Lists)``` protection on the resources. If you don't have a proper permission on a resource, you will receive a ```403``` error response.
You can create any role you want, and select the methods you want to give access to any resources; such as, ```get```, ```post```, ```put```, ```delete```.   
You can use the admin UI for this process. You can create the role from ```System->Roles``` page, and then create the action from ```System->Actions``` page.
Just fill in the form; select the ```Role```, the ```Object``` (resource) and the ```Action``` (HTTP methods) fields.  
If you want a strict control on the permissions, you can use the config file.
```js
roles: {
    test: {
        'default': [
            {name: 'Admin', slug: 'admin'},
            {name: 'User', slug: 'user'},
            {name: 'Guest', slug: 'guest'},
            ...
        ],
        initial: {
            register: 'user'
        },
        actions: {
            user: {
                'test.posts': ['get', 'post'],
                ...
            },
            guest: {
                'test.posts': ['get'],
                ...
            }
        }
    }
}
```

### Master User Level
Not documented

## Models

Models are the core of the ```app.io``` architecture. ```app.io``` basically uses ```Mongoose``` models; 
thus, you can use all abilities of the ```Mongoose``` models, such as, ```Mongoose``` plugins, hooks, validations, etc.

## Field Options

You can use all ```Mongoose``` field options. ```Mongoose``` based options are;  
```default```  
```required```  
```enum``` string  
```lowercase``` string  
```match``` string  
```maxlength``` string  
```minlength``` string  
```trim``` string  
```uppercase``` string  
```max``` number, date  
```min``` number, date  
```expires``` date  

The list of other ```app.io``` based field options are;   
```alias```  
```Mongodb``` key names are very important. Use the smallest keys possible, use the ```alias``` option when using ```REST API```. For example;  
```js
var Schema = {
	...
	em : {type: String, required: true, alias: 'email', unique: true},
	... 
};	
``` 

```settings```  
```optional```  
```allow_html```  
```pattern```   
```minLength```  
```maxLength```  
```exactLength```  
```min```  
```max```  
```lt```  
```lte```  
```gt```  
```gte```  
```ne```  
```rules```  
```pair```  
```owner```  
```flex_ref```  
```entity_acl```  
```belongs_to```  
```depends```  
```s3```  
```from```  

### Model Loader Options

Along with those field options, there are many other loader options. The loader options add new abilities that have not been in ```Mongoose```.  
You have to pass a ```Mongoose``` schema object to the ```app.libpost.model.loader.mongoose``` function as a parameter for these additional abilities.
```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    Name: 'Test_Posts',
    ...
});
```
    
#### Admin UI Options

With the ```Options``` key you can configure admin UI options. Here are the list of the properties;
```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    ...
    Options: {
        singular : 'Test Post',
        plural   : 'Test Posts',
        columns  : ['users', 'title', 'body'],
        main     : 'title',
        perpage  : 25,
        ...
    },
    ...
});
```
    
```singular```  
```plural```  
```columns```  
```extra```  
```main```  
```perpage```  
```sort```  
```filter```  
```nocreate```    
```nodelete```  
```noedit```  
```nested```  
```actions```      
```analytics```      
    
#### Data Denormalization

Denormalizing data from another model is very simple with the ```Denorm``` key.   
If the reference data you have normalized before is updated; the model loader also updates your denormalized data.  
There are two ways of denormalizing the reference model data:  

1. The first way is to add a seperate field to your model. Then, you can denormalize data from another field that has a reference model.  
   For example; you can denormalize the user's email from the reference of the ```users``` field.  
   In order to do this, you should add the ```users_email``` field to your model. Here is the structure;  
  
```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    ...
	Denorm: {
	    'System_Users': {
	        targets: {
	            source: 'users',
	            fields: {users_email: 'email'}
	        }
	    },
	    ...
	},
    ...
});
```

```System_Users``` is the reference model of the ```users``` field, so our source is the ```users``` field.  
Then we can set the fields. We want to denormalize the ```email``` data from the ```System_Users``` model to the ```users_email``` field.
We can set this ```fields``` option like this;
```js
fields: {users_email: 'email'}
```

2. The second way is to choose a reference model. Then, you can denormalize the fields of the reference model to a target field.  
   In this way there is no source field. The model loader collects the denormalized data of every field that has the same reference model.
   
```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    ...
	Denorm: {
	    'System_Users': {
            target: 'data_users',
            fields: 'email'
	    },
	    ...
	},
    ...
});
```

Don't forget to add a field for the denormalized data. In this example, this is the ```data_users``` field.
You have to select the ```Mixed``` type. Write the name of the reference model to the ```from``` option.
```js
d_u : {type: Mixed, alias: 'data_users', from: 'System_Users'},
```

#### Document Owner Protection

```app.io``` has an ```ACL``` protection on the resources, but those are basically the permissions on the resources according to the ```HTTP``` methods.  
With this kind of protection the ownership of the document is not guaranteed.
If you have a ```users``` or a ```profiles``` field on your model, and if you want to guarantee that the owner of the request is also the owner of the document,
then you have to use the ```Owner``` key. Just set the ```users``` (alias: 'users') and the ```profiles``` (profile: {alias: 'profiles'}) fields and 
select the ```HTTP``` methods you want to guarantee the ownership.

```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    ...
    Owner: {
        alias   : 'users',
        profile : {alias: 'profiles'},
        protect : {
            'get'    : true,
            'getid'  : true,
            'post'   : true,
            'put'    : true,
            'remove' : true
        }
    },
    ...
});
```
        
#### Masking API Data

If you are working with the ```REST APIs```, then you will need some important features. Masking the data is one of the important features.  
You may need to mask the data on a ```GET```, a ```POST``` or a ```PUT``` request. You have to use the ```Mask``` key to mask the data.
You can configure the masking options according to an HTTP method, and, according to the role or the ownership level as well.

```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    ...
    Mask: {
        'get': {guest: 'title,body,created_at'},
        'post': {owner: 'title,body'},
        'put': {owner: 'title,body'}
	},
    ...
});
```

The available levels for an ```HTTP``` method are; ```master```, ```owner```, ```user```, ```guest```.

#### Reference Counting

Sometimes you may need the count in a reference model. We have the ```test.posts``` model at the examples above.
If you create a ```test.comments``` model, and if you want to store the count of the comments in a collection on the ```test.posts``` model, you can use this feature.
Just add a field on the ```test.posts``` model for the comment count. Use the ```CountRef``` key to set the reference counting on the ```test.comments``` model.
Our ```test.comments``` schema;
```js
module.exports = function(app) {
    var _query    = app.lib.query;
    var _mongoose = app.core.mongo.mongoose;
    var ObjectId  = _mongoose.Schema.Types.ObjectId;
    var Mixed     = _mongoose.Schema.Types.Mixed;
    
    // schema
    var Schema = {
        u  : {type: ObjectId, required: true, ref: 'System_Users', alias: 'users'},
        p  : {type: ObjectId, required: true, ref: 'Test_Posts', alias: 'posts'},
        b  : {type: String, required: true, alias: 'body'},
        ca : {type: Date, default: Date.now, alias: 'created_at'}
    };

    // settings
    Schema.u.settings = {label: 'User', display: 'email'};
    Schema.p.settings = {label: 'Post', display: 'title'};
    Schema.b.settings = {label: 'Body'};

    // load schema
    var CommentSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Test_Comments',
        Options: {
            singular : 'Test Comment',
            plural   : 'Test Comments',
            columns  : ['users', 'posts', 'body'],
            main     : 'body',
            perpage  : 25
        },
        CountRef: {
            posts: 'comments_count'
        }
    });

    // plugins
    CommentSchema.plugin(_query);

    return _mongoose.model('Test_Comments', CommentSchema);
};
```

You can configure the reference counting just like this;
```js
CountRef: {
	posts: 'comments_count'
}
```

If the comment is removed, then the model loader updates the count. 
Don't forget to add the ```comments_count``` (number) field to the ```test.posts``` model.
        
#### Field Reference Counting

If you want to count the size of a field that has a reference, then you can use the ```Count``` key. It stores the count of the data in the reference collection of the source field.
```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    ...
    Count: {
        'source_field': 'target_field'
    },
    ...
});
```

#### Field Size Calculating

If you have an array field, and if you want to store the size of that array on the document itself, then you can use the ```Size``` key.
```Mongodb``` doesn't give the size of an array by default; in order to get the array size, you have to execute an aggregation query.
The ```Size``` key is simplifies this process. For example;
```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    ...
    Size: {
        tags: 'tags_count'
    },
    ...
});
```

If you have a ```tags``` field on the ```test.posts``` model, then simply add a new ```tags_count``` field to your schema.
The model loader calculates the size of the ```tags``` and updates the ```tags_count```.

#### Field Hook Mechanism

If you want to push the value of a field to a collection on another reference model, then you can use the ```Hook``` key.
```js
var PostSchema = app.libpost.model.loader.mongoose(Schema, {
    ...
    Hook: {
        push: {
            'field_of_the_source_value': 'field_of_the_target_reference:target_field',
            ...
        }
    },
    ...
});
```

**ps**: It doesn't work on the fields that are identified as entities.


### Predefined Models

```app.io``` has a bunch of predefined models. They are used in the ```app.io``` system, for example user registration.
You can use any predefined model you want, or use them as a reference on your models, it's up to you.

#### System Models
Not documented 

##### system.accounts
Not documented

##### system.actions
Not documented

##### system.apps
Not documented

##### system.filters
Not documented

##### system.images
Not documented

##### system.invites
Not documented

##### system.locations
Not documented

##### system.objects
Not documented

##### system.roles
Not documented

##### system.users
Not documented

### Caching Data
Not documented

## Built-in Middlewares
Not documented

### Express Middlewares
Not documented

### app.io Middlewares
Not documented

## Admin UI
Not documented

## Built-in Job Queue
Not documented

## Built-in Cron
Not documented

## Built-in Mailer
Not documented

## Social Authentication
Not documented

## File Uploads
Not documented

## On the Fly Image Resizer
Not documented

## Built-in URL Shortener Service
Not documented

## Built-in RSS Feed Parser
Not documented

## Data Synchronization
Not documented

## Socket.io Support
Not documented

## Oauth
Not documented

## API Documentation
Not documented

## License

```
The MIT License (MIT)

Copyright (c) 2016 Selçuk Fatih Sevinç

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

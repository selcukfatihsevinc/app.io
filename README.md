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
- [Routes]
- [Configuring app.io Instance]
- [Views]
  - [Static Files]
  - [Pagination]
- [API Responses]
- [Detailed Look at ACL]
- [Models]
  - [Field Options]
  - [Model Loader Options]
    - [Admin UI Options]
    - [Data Denormalization]
    - [Document Owner Protection]
    - [Masking API Data]
    - [Reference Counting]
    - [Field Reference Counting]
    - [Field Size Calculating]
    - [Field Hook Mechanism]
  - [Predefined Models]
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
        ca : {type: Date, default: Date.now, alias: 'created_at'},
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
Fiil in the form, select ```User``` for the ```Role``` field, ```Test Posts``` for the ```Object``` field, and ```Get``` and ```Post``` for the ```Action``` field.
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
Not documented

## Configuring app.io Instance
Not documented

## Views
Not documented

### Static Files
Not documented

### Pagination
Not documented

## API Responses
Not documented

## Detailed Look at ACL
Not documented

## Models
Not documented

## Field Options
Not documented

### Model Loader Options
Not documented

#### Admin UI Options
Not documented

#### Data Denormalization
Not documented

#### Document Owner Protection
Not documented

#### Masking API Data
Not documented

#### Reference Counting
Not documented

#### Field Reference Counting
Not documented

#### Field Size Calculating
Not documented

#### Field Hook Mechanism
Not documented

### Predefined Models
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

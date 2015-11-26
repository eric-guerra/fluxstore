'use strict';

var createApp = require('./app');
var port = Number(process.env.PORT) || 3000;
createApp().listen(port, function () {
  console.log('FluxStore on http://localhost:' + port);
});

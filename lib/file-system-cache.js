var cacheManager = require('cache-manager');
var cacheUtils = require('./cache-utils');

var removeBlacklistedQueryParams = function(url) {
  let parsedUrl = new URL(url);
  let blacklistedQueryParams =  (process.env.BLACKLISTED_QUERY_PARAMETERS || '').split(',') || [];
  console.info('Removing blacklisted queryparams: ' + blacklistedQueryParams);
  for(let i of blacklistedQueryParams){
      if(parsedUrl.searchParams.has(i)){
          parsedUrl.searchParams.delete(i);
      }
  }
  let filteredUrl = parsedUrl.toString();
  console.info('Rewritten url after removing blacklisted query params: ' + filteredUrl);
  return filteredUrl;
};

module.exports = {

  init: function() {
    this.cache = cacheManager.caching({
      store: cacheUtils.fileSystemCache
    });
  },

  requestReceived: function(req, res, next) {
    if (req.method !== 'GET') {
      return next();
    }

    /*
     * check the local cache if we have a copy available
     */
    this.cache.get(removeBlacklistedQueryParams(req.prerender.url), function (err, result) {
      if (!err && result) {
        console.info('cache hit for: '+req.prerender.url);
        req.prerender.cacheHit = true;
        res.send(200, result);
      }
      else {
        return next();
      }
    });
  },

  beforeSend: function(req, res, next) {
    if (!req.prerender.cacheHit && req.prerender.statusCode == 200) {
      /*
      * we are only getting here if the cache was not there
      */
      this.cache.set(removeBlacklistedQueryParams(req.prerender.url), req.prerender.content);
    }
    next();
  }
};
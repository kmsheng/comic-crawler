
var Url = require('url');

var CrawlerFactory = (function() {

    function CrawlerFactory() {

        return {
            create: function(siteUrl) {

                var urlParts = Url.parse(siteUrl),
                    host = urlParts.host;

                if ('comic.sfacg.com' === host) {

                    var SkyFireComicCrawler = require('../models/SkyFireComicCrawler'),
                        skyFireComicCrawler = new SkyFireComicCrawler();

                    skyFireComicCrawler.setHost(host);
                    skyFireComicCrawler.setProtocol(urlParts.protocol);

                    return skyFireComicCrawler;
                }
                throw new Error('unsupported site');
            }
        };
    }

    return CrawlerFactory;

})();

module.exports = CrawlerFactory;

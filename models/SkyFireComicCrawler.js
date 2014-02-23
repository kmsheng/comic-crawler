
var Cheerio = require('cheerio'),
    ComicCrawler = require('./ComicCrawler');
    Url = require('url');
    Util = require('util'),
    Process = require('process'),
    Q = require('q');


var SkyFireComicCrawler = (function(ComicCrawler) {

    function SkyFireComicCrawler() {
        ComicCrawler.call(this);
    }

    SkyFireComicCrawler.prototype = Object.create(ComicCrawler.prototype);

    SkyFireComicCrawler.prototype.getChapterLinksByComicLink = function(comicLink) {

        var self = this;
        var urlParts = Url.parse(comicLink);
        var deferred = Q.defer();

        ComicCrawler.prototype.getChapterLinksByComicLink.call(this, comicLink, urlParts.path)
            .then(function(links) {
                var newLinks = [];

                links.forEach(function(link) {

                    var parts = Url.parse(link);

                    if ((! parts.hasOwnProperty('protocol')) && (! parts.hasOwnProperty('host'))) {
                        newLinks.push(self.getProtocol() + '//' + self.getHost() + link);
                    }
                });

                deferred.resolve(newLinks);
            });

        return deferred.promise;
    };

    SkyFireComicCrawler.prototype.getImageUrlsByChapterLink = function(chapterLink) {

        var self = this;
        var deferred = Q.defer();

        self.getHtmlByUrl(chapterLink)
            .then(function(html) {

                var $ = Cheerio.load(html),
                    jqScripts = $('script');

                if (0 === jqScripts.length) {
                    deferred.reject('SkyFireComicCrawler.prototype.getHtmlByUrl() scripts length is 0');
                }

                var matchCount = 0;

                jqScripts.each(function(index, elem) {

                    var url = $(this).attr('src');

                    if ('undefined' === typeof url) {
                        return;
                    }

                    // match url e.g. /Utility/1602/013.js , /Utility/1368/TBP/TBP01.js
                    if (url.match(/\/Utility\/\d+(\/\w+)*\.js/)) {

                        matchCount++;

                        var urlParts = Url.parse(url);

                        // make it absolute url if it's not
                        if ((! urlParts.hasOwnProperty('protocol')) && (! urlParts.hasOwnProperty('host'))) {
                            url = self.getProtocol() + '//' + self.getHost() + urlParts.pathname;
                        }

                        ComicCrawler.prototype.getHtmlByUrl(url)
                            .then(function(html) {

                                var matches = html.match(/"([\w\/]+)\.(png|jpg)"/gi);
                                var trimmedUrls = [];

                                matches.forEach(function(url) {
                                    trimmedUrls.push(url.substring(1, url.length - 1));
                                })
                                deferred.resolve(trimmedUrls);
                            }, function(reason) {
                                console.log('ComicCrawler.prototype.getHtmlByUrl failed');
                                deferred.reject('ComicCrawler.prototype.getHtmlByUrl failed');
                            });

                        return false;
                    }
                });

                if (0 === matchCount) {
                    deferred.reject('ComicCrawler.prototype.getHtmlByUrl() match count is 0');
                }
            }, function(reason) {
                console.log(reason);
            });

        return deferred.promise;
    };

    return SkyFireComicCrawler;

})(ComicCrawler);

module.exports = SkyFireComicCrawler;

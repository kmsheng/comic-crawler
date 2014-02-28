
var Cheerio = require('cheerio'),
    ComicCrawler = require('./ComicCrawler');
    Mkdirp = require('mkdirp'),
    Moment = require('moment'),
    Process = require('process'),
    Q = require('q');
    Url = require('url'),
    Util = require('util'),
    Path = require('path');

var start = Moment().unix();

var BAR_CHAR = 'win32' === process.platform ? '■' : '▇';

module.exports = SkyFireComicCrawler;

function SkyFireComicCrawler() {
    ComicCrawler.call(this);
}

Util.inherits(SkyFireComicCrawler, ComicCrawler);

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
                            Util.error('ComicCrawler.prototype.getHtmlByUrl failed', reason);
                            deferred.reject(reason);
                        });

                    return false;
                }
            });

            if (0 === matchCount) {
                deferred.reject('ComicCrawler.prototype.getHtmlByUrl() match count is 0');
            }
        }, function(reason) {
            deferred.reject(reason);
        });

    return deferred.promise;
};

SkyFireComicCrawler.prototype.handleChapterLinks = function(chapterLinks) {

    Util.log('handleChapterLinks');

    var self = this;
    var clonedChapterLinks = chapterLinks.slice();
    var chapterImageUrls = [];

    this.getImageUrlsOneByOne(clonedChapterLinks, chapterImageUrls)
        .then(function(imageUrlsSets) {

            var downloadInfos = [];

            var dirname = __dirname + '/download/' + comicLink.replace('http://', '');
            Mkdirp(dirname);

            imageUrlsSets.forEach(function(set, index) {

                var chapter = chapterLinks[index].replace(comicLink, '').replace('/', '').replace(/\//g, '-');

                set.forEach(function(imageUrl) {

                    var urlParts = Url.parse(imageUrl);
                    if ((! urlParts.hasOwnProperty('protocol')) && (! urlParts.hasOwnProperty('host'))) {
                        imageUrl = self.getProtocol() + '//' + self.getHost() + imageUrl;
                    }

                    var filename = chapter + '-' + Path.basename(imageUrl);

                    var matches;

                    if (matches = filename.match(/(_\d+)\./)) {
                        filename = filename.replace(matches[1], '');
                    }

                    downloadInfos.push({
                        downloadUrl: imageUrl,
                        dirname: dirname,
                        filename: filename,
                        fullPath: Path.join(dirname, filename)
                    });
                });
            });

            var clonedDownloadInfos = downloadInfos.slice();

            var total = downloadInfos.length;

            var downloadOneByOne = function(downloadInfos) {

                var deferred = Q.defer();

                var recursiveDownload = function(downloadInfos, deferred) {
                    var info = downloadInfos.pop();

                    if ('undefined' === typeof info) {
                        deferred.resolve('done');
                        Util.log('download complete');
                        return false;
                    }

                    self.download(info.downloadUrl, info.fullPath)
                        .then(function(ret) {
                            var downloaded = total - downloadInfos.length,
                                percent = parseInt(downloaded / total * 100, 10);
                                barLength = parseInt(percent / 5, 10);

                            var bar = new Array(barLength).join(BAR_CHAR);
                            Util.log(Moment.duration(Moment().unix() - start, 'seconds').humanize());
                            Util.log(bar + ' ' + percent + '% (' + downloaded + ' / ' + total + ')');

                        })
                        .fail(function(reason) {
                            Util.debug(reason);
                        })
                        .fin(function() {
                            return recursiveDownload(downloadInfos, deferred);
                        });

                };
                recursiveDownload(downloadInfos, deferred);

                return deferred.promise;
            };

            downloadOneByOne(clonedDownloadInfos);

        })
        .fail(function(reason) {
            Util.error(reason);
        });

};

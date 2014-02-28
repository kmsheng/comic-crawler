
var BufferHelper = require('bufferhelper'),
    Cheerio = require('cheerio'),
    Extend = require('extend'),
    Fs = require('fs'),
    Http = require('http'),
    Iconv = require('iconv-lite'),
    Q = require('q'),
    Request = require('request'),
    Url = require('url'),
    Util = require('util');

Http.globalAgent.maxSockets = 100;

module.exports = ComicCrawler;

function ComicCrawler() {
    this.host = '';
    this.protocol = '';
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel'
        + ' Mac OS X 10_9_0) AppleWebKit/537.36 '
        + '(KHTML, like Gecko) Chrome/31.0.1650.63'
        + ' Safari/537.36';
}

ComicCrawler.prototype.setProtocol = function(protocol) {
    this.protocol = protocol;
}

ComicCrawler.prototype.getProtocol = function() {
    return this.protocol;
}

ComicCrawler.prototype.setHost = function(host) {
    this.host = host;
}

ComicCrawler.prototype.getHost = function() {
    return this.host;
}

ComicCrawler.prototype.getHtmlByUrl = function(url, encoding) {

    var deferred = Q.defer(),
        encoding = encoding || 'UTF-8',
        parts = Url.parse(url),
        self = this;

    var options = {
        host: parts.host,
        port: 80,
        path: parts.path,
        method: 'GET',
        headers: {
            'Referer': url,
            'User-Agent': self.userAgent
        }
    };

    var request = function() {

        var req = Http.request(options, function(res) {

            var bufferhelper = new BufferHelper();

            res.on('data', function(chunk) {
                bufferhelper.concat(chunk);
            });
            res.on('end', function() {

                var html = Iconv.decode(bufferhelper.toBuffer(), encoding);
                deferred.resolve(html);
            });
        }).on('error', function(e) {
            Util.log('Error: -> ' + e.message + e.stack);
            request();
        });

        req.end();
    };
    request();

    return deferred.promise;
};

ComicCrawler.prototype.getChapterLinksByComicLink = function(comicLink, regexp) {

    var deferred = Q.defer(),
        re = new RegExp(regexp, 'g'),
        self = this;

    self.getHtmlByUrl(comicLink)
        .then(function(html) {

            var $ = Cheerio.load(html),
                links = [];
            $('a').each(function(index, elem) {
                var href = $(this).attr('href');

                if (href.match(re)) {
                    links.push(href);
                }
            });
            deferred.resolve(links);
        }, function(reason) {
            deferred.reject(reason);
        });

    return deferred.promise;
};

ComicCrawler.prototype.getImageUrlsByChapterLink = function(chapterLink) {
};

ComicCrawler.prototype.getImageUrlsOneByOne = function(chapterLinks, chapterImageUrls) {

    var deferred = Q.defer(),
        self = this;

    var getImageUrlsOneByOne = function(chapterLinks, chapterImageUrls, deferred) {

        var chapterLink = chapterLinks.pop();

        if ('undefined' === typeof chapterLink) {
            deferred.resolve(chapterImageUrls);
            return false;
        }

        self.getImageUrlsByChapterLink(chapterLink)
            .then(function(imageUrls) {
                Util.log('getting links: ' + chapterLinks.length + ' rest');
                chapterImageUrls.push(imageUrls);
            }, function(reason) {
                Util.error('ComicCrawler.prototype.getImageUrlsOneByOne failed', reason);
            })
            .fin(function() {
                getImageUrlsOneByOne(chapterLinks, chapterImageUrls, deferred);
            });
    };

    getImageUrlsOneByOne(chapterLinks, chapterImageUrls, deferred);

    return deferred.promise;
};

ComicCrawler.prototype.download = function(url, filename, options) {

    options = Extend({
        reDownload: false
    }, options);

    var deferred = Q.defer();

    var maxTries = 3;

    var requestHead = function() {

        var options = {
            url: url,
            method: 'HEAD',
            maxSockets: 100
        };
        Request(options, function(err, res, body) {

            if (err) {
                Util.log('requestHead error: ' + e);

                if (++maxTries > 3) {
                    deferred.resolve(filename);
                } else {
                    requestHead();
                }
            } else {

                if (! Fs.existsSync(filename)) {

                    Util.log('content-type: ' + res.headers['content-type']);
                    Util.log('content-length: ' + res.headers['content-length']);

                    var ws = Fs.createWriteStream(filename);

                    ws.on('error', function(err) {
                        Util.error('error create write stream');
                    });

                    try {
                        Request(url).pipe(ws).on('close', function() {
                            deferred.resolve(filename);
                        });
                    } catch (e) {
                        Util.error('catched exception of on close event');
                        deferred.reject(filename);
                    }

                } else {
                    Util.log('files already exist');
                    deferred.resolve(filename);
                }
            }
        });
    };

    requestHead();

    return deferred.promise;
};

ComicCrawler.prototype.handleChapterLinks = function() {
};

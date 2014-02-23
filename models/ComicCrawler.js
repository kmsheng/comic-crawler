
var BufferHelper = require('bufferhelper'),
    Cheerio = require('cheerio'),
    Extend = require('extend'),
    Fs = require('fs'),
    Http = require('http'),
    Iconv = require('iconv-lite'),
    Request = require('request'),
    Url = require('url'),
    Q = require('q');

if (process.env.NODE_ENV !== 'production') {
 //   require('longjohn');
}

var ComicCrawler = (function() {

    function ComicCrawler() {
        this.host = '';
        this.protocol = '';
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36';
    };

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
            headers: {
                'Referer': url,
                'User-Agent': self.userAgent
            }
        };

        Http.get(options, function(res) {

            var bufferhelper = new BufferHelper();

            res.on('data', function(chunk) {
                bufferhelper.concat(chunk);
            });
            res.on('end', function() {

                var html = Iconv.decode(bufferhelper.toBuffer(), encoding);
                deferred.resolve(html);

            });
        }).on('error', function(e) {
            console.log('Error: -> ', options, e.message, e.stack);
            deferred.resolve('');
        });

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
                    console.log('getting links: ' + chapterLinks.length + ' rest');
                    chapterImageUrls.push(imageUrls);
                }, function(reason) {
                    console.log('ComicCrawler.prototype.getImageUrlsOneByOne failed', reason);
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

        Request.head(url, function(err, res, body) {

            if (err) {
                deferred.reject(err);
            } else {
                console.log('content-type:', res.headers['content-type']);
                console.log('content-length:', res.headers['content-length']);

                if ((! Fs.exists(filename)) || options.reDownload) {

                    try {
                        Request(url).pipe(Fs.createWriteStream(filename));
                    } catch(e) {
                        console.log('create write stream failed', e);
                    }
                } else {
                    console.log('files already exist');
                }

                deferred.resolve(filename);
            }
        });

        return deferred.promise;
    };

    return ComicCrawler;
})();

module.exports = ComicCrawler;

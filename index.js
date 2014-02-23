var Mkdirp = require('mkdirp'),
    Url = require('Url'),
    Util = require('util'),
    Path = require('path'),
    Process = require('process'),
    Q = require('q');

var CrawlerFactory = require('./factories/CrawlerFactory');

var crawler = new CrawlerFactory().create('http://comic.sfacg.com/');

var args = Process.argv;

comicLink = args[2];

crawler.getChapterLinksByComicLink(comicLink)
    .then(function(chapterLinks) {

        var clonedChapterLinks = chapterLinks.slice();
        var chapterImageUrls = [];
        crawler.getImageUrlsOneByOne(clonedChapterLinks, chapterImageUrls)
            .then(function(imageUrlsSets) {

                var downloadInfos = [];

                imageUrlsSets.forEach(function(set, index) {

                    var dirname = __dirname + '/download/' + chapterLinks[index].replace('http://', '');
                    Mkdirp(dirname);

                    set.forEach(function(imageUrl) {

                        var urlParts = Url.parse(imageUrl);
                        if ((! urlParts.hasOwnProperty('protocol')) && (! urlParts.hasOwnProperty('host'))) {
                            imageUrl = crawler.getProtocol() + '//' + crawler.getHost() + imageUrl;
                        }

                        var filename = Path.basename(imageUrl);

                        downloadInfos.push({
                            downloadUrl: imageUrl,
                            dirname: dirname,
                            filename: filename,
                            fullPath: Path.join(dirname, filename)
                        });
                    });
                });

                var clonedDownloadInfos = downloadInfos.slice();

                var downloadOneByOne = function(downloadInfos) {

                    var deferred = Q.defer();

                    var recursiveDownload = function(downloadInfos, deferred) {
                        var info = downloadInfos.pop();

                        if ('undefined' === typeof info) {
                            console.log('done');
                            deferred.resolve('done');
                            console.log('complete downloading');
                            return false;
                        }
                        console.log(info.downloadUrl, info.fullPath);

                        crawler.download(info.downloadUrl, info.fullPath)
                            .then(function(ret) {
                                console.log('done');
                            }, function(reason) {
                                console.log('fail');
                            })
                            .fin(function() {
                                return recursiveDownload(downloadInfos, deferred);
                            });

                    };
                    recursiveDownload(downloadInfos, deferred);

                    return deferred.promise;
                };

                downloadOneByOne(clonedDownloadInfos);

            }, function(reason) {
                console.log(reason);
            });

    });

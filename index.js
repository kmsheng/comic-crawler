var Mkdirp = require('mkdirp'),
    Url = require('Url'),
    Util = require('util'),
    Path = require('path'),
    Moment = require('moment'),
    Process = require('process'),
    Q = require('q');

var start = Moment().format('YYYY MMM Do h:mm:ss a');

var CrawlerFactory = require('./factories/CrawlerFactory');

var crawler = new CrawlerFactory().create('http://comic.sfacg.com/');

var BAR_CHAR = 'win32' === process.platform ? '■' : '▇';

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

                var total = downloadInfos.length;

                var downloadOneByOne = function(downloadInfos) {

                    var deferred = Q.defer();

                    var recursiveDownload = function(downloadInfos, deferred) {
                        var info = downloadInfos.pop();

                        if ('undefined' === typeof info) {
                            deferred.resolve('done');
                            console.log('download complete');
                            return false;
                        }

                        crawler.download(info.downloadUrl, info.fullPath)
                            .then(function(ret) {
                                var downloaded = total - downloadInfos.length,
                                    percent = parseInt(downloaded / total * 100, 10);
                                    barLength = parseInt(percent / 5, 10);

                                var bar = new Array(barLength).join(BAR_CHAR);
                                console.log('start time: ' + start + ' - ' + Moment().from(start));
                                console.log(bar + ' ' + percent + '% (' + downloaded + ' / ' + total + ')');

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

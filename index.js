var Mkdirp = require('mkdirp'),
    Url = require('Url'),
    Util = require('util'),
    Path = require('path'),
    Moment = require('moment'),
    Process = require('process'),
    Q = require('q');

if (Process.env.NODE_ENV !== 'production') {
    require('longjohn');
}

var start = Moment().unix();

var CrawlerFactory = require('./factories/CrawlerFactory');

var crawler = new CrawlerFactory().create('http://comic.sfacg.com/');

var args = Process.argv;

comicLink = args[2];

var handleChapterLink = function(chapterLinks) {
    crawler.handleChapterLinks(chapterLinks);
};

var handleException = function(reason) {
    Util.error(reason);
};

crawler.getChapterLinksByComicLink(comicLink)
    .then(handleChapterLink)
    .fail(handleException);;

var AdmZip = require('adm-zip'),
    Fs = require('fs'),
    Process = require('process'),
    Util = require('util'),
    Walk = require('walk');

var path = __dirname + '/download/comic.sfacg.com/HTML/AREAX';

var zip = new AdmZip();

var walker = Walk.walk(path, { followLinks: false });

/*walker.on('directories', function(root, dirStatsArray, next) {
    console.log(root);
    next();
});*/

var box = [];

walker.on('file', function(root, stat, next) {

    if (root === path) {
        return next();
    }

    var filepath = (root + '/' + stat.name);
    var zipName = 'AREAD-' + (root.replace(path + '/', ''));

    if (! box[zipName]) {
        box[zipName] = [];
    }

    box[zipName].push(filepath);

    return next();
});

walker.on('end', function() {
    console.log('all done');
    for (var zipName in box) {
        if (! box.hasOwnProperty(zipName)) {
            continue;
        }
        var zip = new AdmZip();

        box[zipName].forEach(function(path) {
            zip.addLocalFile(path);
        });

        console.log('writing ' + zipName + '.zip ...');
        zip.writeZip(zipName + '.zip');
    }
});

/*Fs.readdir(path, function(err, files) {
    if (err) {
        throw err;
    }

    files.forEach(function(file) {
     //   zip.addLocalFile(path + file);
    });

    //zip.writeZip('test.zip');
});
*/

const ffmpeg = require('fluent-ffmpeg'),
    path = require('path'),
    tmp = './tmp',
    fs = require('fs');

if (!fs.existsSync(tmp)){
    fs.mkdirSync(tmp);
}

var walkSync = function(dir, dirName, filelist) {
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || {};
    filelist[dirName] = [];
    files.forEach(file => {
        if (fs.statSync(dir + '/' + file).isDirectory()) {
            filelist = walkSync(dir + '/' + file, file, filelist);
        }
        else {
            filelist[dirName].push(file);
        }
    });
    return filelist;
};

let snaps = './snaps';
let fileList = walkSync(snaps, 'baseDir');
let folderNames = Object.keys(fileList)
let lastFolder = Object.keys(fileList).pop();

function processFiles(position){
    return processFolder(folderNames[position], 0).then( (processFolderName) => {
        if (processFolderName === lastFolder){
            return 0; 
        }

        position+= 1;
        return processFiles(position);
    });
}

return processFiles(1);

function processFolder(dirName, index){
    let tmpPath = path.join(tmp, dirName)
    if (!fs.existsSync(tmpPath)){
        fs.mkdirSync(tmpPath);
    }
    return new Promise((resolve, reject) => {
        function processFile(file, index){
            if (index === fileList[dirName].length)
                return resolve(dirName);

            index+=1;
            processVideo(file, dirName).then( () => {
                let file = fileList[dirName][index];
                return processFile(file, index);
            });
        }

        return processFile(fileList[dirName][0], 0);
    });
}

function processVideo(fileName, dirName){
    return new Promise( (resolve, reject) => {
        let videoPath = path.join(snaps, dirName, fileName);
        let filePath = path.join(tmp, dirName, fileName)
        console.log(`Procesando ${videoPath}`);
        let imagesFolder = filePath.split('.').slice(0, -1).join('.').replace(/\s|\(|\)/g, '-')
        let onlyName = fileName.split('.').slice(0, -1).join('.');
        if (!fs.existsSync(imagesFolder)){
            fs.mkdirSync(imagesFolder);
        }
        let output = path.join(imagesFolder, `./%6d.png`);
        let cmd = ffmpeg(videoPath).audioCodec('libmp3lame').audioChannels(2);
        cmd.outputOptions([ '-r', 12]);
        let promises = [];
        promises.push(process(cmd, output, true));
        output = path.join(imagesFolder, `${onlyName}.mp3`);
        promises.push(process(cmd, output));
        Promise.all(promises).then( async() => {
            const util = require('util');
            const exec = util.promisify(require('child_process').exec);
            let onlyImagesPath = `${imagesFolder}/\*.png`;

            async function createMng()  {
                const { stdout, stderr } = await exec(`advmng -a 12 "${imagesFolder}/${onlyName}.mng" ${onlyImagesPath}`);

                if (stderr) {
                    console.error(`error: ${stderr}`);
                }
                const rimraf = require('rimraf');
                setTimeout( () => {
                    return rimraf(onlyImagesPath, () => {
                        return resolve(dirName);
                    });
                }, 1000);
            }

            createMng();
        });
    });
}

function process(cmd, output, remove = false){
    return new Promise((resolve, reject) => {
        cmd
            .on('end', () => { resolve(output) })
            .on('error', (err) => reject(err))
            .output(output)
            .run();
    });
}

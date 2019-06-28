const ffmpeg = require('fluent-ffmpeg'),
	      path = require('path'),
	      tmp = './tmp',
	      fs = require('fs');

if (!fs.existsSync(tmp)){
	fs.mkdirSync(tmp);
};

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
};

return processFiles(1);

function processFolder(dirName, index){
	let tmpPath = path.join(tmp, dirName)
	if (!fs.existsSync(tmpPath)){
		fs.mkdirSync(tmpPath);
	};
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
		let imagesFolder = filePath.split('.').slice(0, -1).join('.');
		let onlyName = fileName.split('.').slice(0, -1).join('.');
		if (!fs.existsSync(imagesFolder)){
			fs.mkdirSync(imagesFolder);
		};
	        let output = path.join(imagesFolder, `./${onlyName}-%d.png`);
      	        let cmd = ffmpeg(videoPath);
		cmd.outputOptions([ '-r', Math.max(1, 12) ]);
		//return resolve(dirName);
		return new Promise((convertResolve, convertReject) => {
			  cmd
			    .on('end', () => convertResolve(output))
			    .on('error', (err) => convertReject(err))
			    .output(output)
			    .run();
		}).then( () => { 
			return resolve(dirName);
		});
	});
}


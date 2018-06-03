// This file lives in the client side and has access to the dom
// if it needs to talk to node.js or files, it needs to use the ipcRenderer to
// chat to the electron process.  this will then hop over to main.js.



/* eslint-disable import/extensions */  // --> OFF
/* eslint-disable import/no-extraneous-dependencies */  // --> OFF
/* eslint-disable import/no-unresolved  */  // --> OFF

const {ipcRenderer, webFrame, remote} = require('electron');


// disable zooming inside of the browser.  This just messes up scratch jr
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

/* eslint-enable import/extensions */  // --> ON
/* eslint-enable import/no-extraneous-dependencies */  // --> ON
/* eslint-enable import/no-unresolved  */  // --> ON


const DEBUG =   remote.getCurrentWebContents().browserWindowOptions.isDebug;  // grab the DEBUG variable from main. This is passed through the BrowserWindow creation
const DEBUG_FILEIO =  DEBUG && true;       // saving and loading user files
const DEBUG_RESOURCEIO = DEBUG && false;  // files from the application directory
const DEBUG_NYI = DEBUG && true;          // stuff not yet implemented
const DEBUG_DATABASE = DEBUG &&  false;    // database access
const DEBUG_CAMERA = DEBUG && false;      // camera access
const DEBUG_AUDIO = DEBUG && true;           // audio interface
const DEBUG_AUDIOMETER = DEBUG &&  false;  // volume feedback
const DEBUG_WRITE_ERRLOG = DEBUG && true;

let hasCapturedErrors;

// Debugging the electron process:
// note to use a debugger use 'npm run debugMain' and load up chrome://inspect
// ============================================================================
// use one wrapper for debugging so we can turn it on and off at a
// central place
function debugLog(...args) {
    if (DEBUG) {
        console.log(...args); // eslint-disable-line no-console
    }
    
    if (DEBUG_WRITE_ERRLOG) {
    	if (!hasCapturedErrors) {
    		hasCapturedErrors = true;
    		
    		// install an error event handler to capture unhandled messages
    		window.addEventListener('error', function (e) {
			  	ipcRenderer.send('debugWriteLog', e);
			});
    	}
    	return ipcRenderer.send('debugWriteLog', args);
    }
    return true;
}
debugLog('electronClient debugLog enabled =======================');


// reload the projects if the database has been reloaded off disk.
ipcRenderer.on('databaseRestored', function() {
    // same as homeGoBack - reload the projects
    window.location.href = 'index.html?back=yes';
});




class ElectronDesktopInterface {


    constructor () {
        this.currentAudio = {};
    }

    database_stmt(json) {
        return ipcRenderer.sendSync('database_stmt', json);

    }
    database_query(json) {
        if (DEBUG_DATABASE) debugLog('beginning database_query', json);
        let res = ipcRenderer.sendSync('database_query', json);
        if (DEBUG_DATABASE) debugLog('end database_query', res);
        return res;

    }

    io_getsettings(){

        if (DEBUG_RESOURCEIO) debugLog('io_getsettings');
        let settings = ipcRenderer.sendSync('io_getsettings', null);
        return settings;


    }

    io_getmedia(file){

        if (DEBUG_FILEIO) debugLog('io_getmedia', file);
        return ipcRenderer.sendSync('io_getmedia', file);

    }

    io_getmediadata(key, offset, length){

        if (DEBUG_FILEIO) debugLog('io_getmediadata', key, offset, length);
        return ipcRenderer.sendSync('io_getmediadata', key, offset, length);

    }

    io_getmediadone(key){

        if (DEBUG_FILEIO) debugLog('io_getmediadone', key);
        return ipcRenderer.sendSync('io_getmediadone', key);

    }
    io_getmedialen(file, key){

        if (DEBUG_FILEIO) debugLog('io_getmedialen', file, key);
        return ipcRenderer.sendSync('io_getmedialen', file, key);

    }

    io_setmedia(str,  ext){
        if (DEBUG_FILEIO)  debugLog('io_setmedia', str, ext);
        return ipcRenderer.sendSync('io_setmedia', str,  ext);

    }

    io_setmedianame(str, name, ext){
        if (DEBUG_FILEIO) debugLog('io_setmedianame', name, ext);

        return ipcRenderer.sendSync('io_setmedianame', str, name, ext);
    }

    io_getmd5(str){
        if (DEBUG_FILEIO) debugLog('io_getmd5', str);
        return (str) ? ipcRenderer.sendSync('io_getmd5', str) : null;
    }


    io_remove(str){
        if (DEBUG_NYI)  debugLog('io_remove - NYI', str);
        return ipcRenderer.sendSync('io_remove', str);

    }

    io_cleanassets(str){
        if (DEBUG_NYI) {
            debugLog('io_cleanassets - NYI', str);
        }
        return ipcRenderer.sendSync('io_cleanassets', str);

    }


    io_registersound(dir, name){

        if (!this.currentAudio[name]) {
            let dataUri = ipcRenderer.sendSync('io_getAudioData', name);
            this.loadSoundFromDataURI(name, dataUri);

        }


    }

    loadSoundFromDataURI(name, dataUri) {
        if (dataUri && name) {
            let audio = new window.Audio(dataUri);
            audio.volume = 0.8;  // don't oversaturate the speakers
            audio.onended = function() {
                // we need to tell ScratchJR the sound is done
                // so that it will progress to the next block.
                iOS.soundDone(name); // eslint-disable-line no-undef

            };
            
            this.currentAudio[name] = audio;
        }
    }

    io_getfile(str){
        if (DEBUG_FILEIO) debugLog('io_getfile', str);

        // returns a file from the scratch jr documents folder
        return ipcRenderer.sendSync('io_getfile', str);


    }

    io_gettextresource(filename){
        if (DEBUG_RESOURCEIO) debugLog('io_gettextresource', filename);

        // returns a file from the app resource folder
        return ipcRenderer.sendSync('io_gettextresource', filename);


    }




    io_setfile(name, btoa_str){
        if (DEBUG_FILEIO)  debugLog('io_setfile', name, btoa_str);

        return ipcRenderer.sendSync('io_setfile', {name: name, contents: btoa_str});
    }




    getAudioCaptureElement() {
        if (!this.audioCaptureElement) {
            this.audioCaptureElement = new AudioCapture();
            // this is mainly used for debugging purposes
            // so we can test when there is no microphone.
            this.audioCaptureElement.isRecordingPermitted = true;
             
        }
        return this.audioCaptureElement;
    }

    // sounds
    io_playsound(name){
        if (DEBUG_AUDIO) debugLog('io_playsound', name);

		let audioElement = this.currentAudio[name];
        if (!audioElement) {
            debugLog('io_playsound: unable to play unregistered sound - skipping', name);
         
         	// tell scratch the empty sound has finished - otherwise
         	// the green blocks will not progress
         	setTimeout(function() {
         		iOS.soundDone(name); // eslint-disable-line no-undef 
         	}, 1);
         
            return;
        }

        //https://medium.com/@Jeff_Duke_io/working-with-html5-audio-in-electron-645b2d2202bd

        try {
            let playPromise = audioElement.play();

            // In browsers that don’t yet support this functionality,
            // playPromise won’t be defined.
            if (playPromise !== undefined) {
				  playPromise.then(
				  	function() {
					// Automatic playback started!
					}).catch(function(error) {
					// Automatic playback failed.
					// Show a UI element to let the user manually start playback.
					debugLog(error);
				  });
            }
        }  catch (e) {
            debugLog('could not play sound', e);
        }
    }


    io_stopsound(name){
        if (DEBUG_AUDIO) debugLog('io_stopsound', name);

		let audioElement = this.currentAudio[name];
    
        if (audioElement) {
          audioElement.pause();  
        }
        
    }



    /** called when the record button is pressed*/
    recordsound_recordstart(){
        return this.getAudioCaptureElement().startRecord();
    }

    /** called when the stop button is pressed or the tickmark is pressed during the record operation*/
    recordsound_recordstop(){

        this.getAudioCaptureElement().stopRecord();

    }

    /** called during recording to display volume on the volume meter */
    recordsound_volume (){

        return this.getAudioCaptureElement().getVolume();

    }

    /** called when the tickmark is chosen in the record dialog*/
    recordsound_recordclose(keep) {

		try {
			let electronDesktopInterface =  this;

			let audioCaptureElement = this.getAudioCaptureElement();

			if (keep === 'YES') {

				let blob = audioCaptureElement.captureRecordingAsBlob();
				if (blob) {
					let filename = audioCaptureElement.getId();

					let fileReader = new FileReader();
					fileReader.onload = function () {
						// saving new sound...  will save as a webm file.
						electronDesktopInterface.io_setmedianame(fileReader.result, filename, 'webm');
						electronDesktopInterface.loadSoundFromDataURI(filename + '.webm', fileReader.result);
			
					};
					fileReader.readAsDataURL(blob);
				}

			}
        } catch (e) {
    		debugLog('Error saving sound', e);
        }

    }


    recordsound_startplay (){
        if (DEBUG_AUDIO) debugLog('recordsound_recordstart');
        this.getAudioCaptureElement().startPlay();



    }
    recordsound_stopplay(){
        if (DEBUG_AUDIO) debugLog('recordsound_stopplay');
        this.getAudioCaptureElement().stopPlay();

    }


    askForPermission(){
        if (DEBUG_AUDIO) debugLog('askForPermission', name);
        return true;
    }

    hideSplash(){
    	return true;
    }

    deviceName(){
        return 'desktop';
    }

    analyticsEvent(category, action, usageLabel, value) {
        if (DEBUG_NYI) debugLog('Analytics Event!', category, action, usageLabel, value);
    }


    scratchjr_stopfeed() {
        if (DEBUG_CAMERA) debugLog('scratchjr_stopfeed NYI');
        if (this.cameraPickerDialog) {
            this.cameraPickerDialog.hide();
            this.cameraPickerDialog = null;

        }

    }
    scratchjr_choosecamera(mode) {
        if (DEBUG_CAMERA) debugLog('scratchjr_choosecamera NYI', mode);
    }

    scratchjr_captureimage(whenDone) {
        if (DEBUG_CAMERA) debugLog('scratchjr_captureimage NYI', whenDone);


        if (this.cameraPickerDialog) {
           let imgData =    this.cameraPickerDialog.snapshot();
           if (imgData) {
                let base64resultNoDataPrefix = imgData.split(',')[1];

                Camera.processimage(base64resultNoDataPrefix); // eslint-disable-line no-undef
           }


        }

    }

    scratchjr_cameracheck(...args) {
        if (DEBUG_CAMERA || DEBUG_NYI) debugLog('scratchjr_cameracheck', args);

        return true;
    }
    scratchjr_startfeed(str) {
        if (DEBUG_CAMERA) debugLog('scratchjr_startfeed', str);
        let data = JSON.parse(str);

        if (!this.cameraPickerDialog) {

            this.cameraPickerDialog = new CameraPickerDialog(data);
            this.cameraPickerDialog.show();

        }




    }




} // class ElectronDesktopInterface



/* =========================
    wrappers around 'getUserMedia'
================================*/

(function() { // eslint-disable-line wrap-iife

    let promisifiedOldGUM = function(constraints, successCallback, errorCallback) { // eslint-disable-line no-unused-vars

        // First get ahold of getUserMedia, if present
        let getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia);

        // Some browsers just don't implement it - return a rejected promise with an error
        // to keep a consistent interface
        if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser')); // eslint-disable-line no-undef
        }

        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
        return new Promise(function(successCallback, errorCallback) { // eslint-disable-line no-undef
            getUserMedia.call(navigator, constraints, successCallback, errorCallback);
        });

    };

    // Older browsers might not implement mediaDevices at all, so we set an empty object first
    if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
    }

    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.
    if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
    }

})();

// let audioCaptureElement, videoCaptureElement;


class AudioCapture {
    constructor  () {
        this.audioCtx = new (window.AudioContext || webkitAudioContext)(); // eslint-disable-line no-undef
        this.audioElement = new window.Audio();
		this.audioPlaybackElement = null;
		this.errorHandler = null;
    }

    getId (isNewRecording) {

        if (isNewRecording || !this.id) {
     // uuid generator
            this.id =  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
          });

        }
        return this.id;
    }
    startRecord(constraints) {
    	this.savedBlob = null;
    	
    	constraints = constraints || { audio: true };
        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(constraints).then(
                                this.beginStartRecord.bind(this),
                                this.onError.bind(this));
        }
        return this.getId(/*isNewRecording*/ true) + '.webm';
    }

    beginStartRecord(stream) {
    	if (!this.isRecordingPermitted) {
    		throw (new Error('Recording audio is turned off'));
    	}
    	this.chunks = null;
        this.currentStream = stream;
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = this.onRecordData.bind(this);
        this.mediaRecorder.start();

    }

    onError(e) {
        debugLog(e);
        if (this.errorHandler) {
        	this.errorHandler(e);
        }
        
    }

    onRecordData (e) {
        if (!this.chunks) {
            this.chunks = [];
        }
        this.chunks.push(e.data);


    }

    captureRecordingAsBlob() {
    	if (this.savedBlob) return this.savedBlob;
    	
    	try {
			if (!this.chunks || this.chunks.length == 0) {
				if (this.mediaRecorder && this.mediaRecorder.state != 'inactive') {
					this.mediaRecorder.requestData();
				}
			}
			
			if (!this.chunks) return null;
			
			let blob  = new Blob(this.chunks, { type: 'audio/ogg; codecs=opus' });
			this.chunks = [];

			this.audioElement.srcObject = this.currentStream;

			this.savedBlob = blob;
			return this.savedBlob;
		
		} catch (e) {
			if (DEBUG_AUDIO) debugLog('ERROR saving audio.', e);
			this.savedBlob = null;
			return null;
		}
        

    }
    stopRecord() {

        this.stopAudioMeter();

        if (this.mediaRecorder) {
            //this.mediaRecorder.stop();

            // https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/ondataavailable
            this.mediaRecorder.requestData();
            this.mediaRecorder.stop();

        }
        this.mediaRecorder = null;

    }

    stopPlay() {
    	if (this.audioPlaybackElement) {
        	this.audioPlaybackElement.pause();
        	this.audioPlaybackElement = null;
		}
    }
    startPlay() {
		// stop the recording
		if (this.mediaRecorder) {
			this.stopRecord();
		}
		
		let blob = this.captureRecordingAsBlob();
      
		if (blob) {
			let fileReader = new FileReader();
			fileReader.onload = function () {
				this.audioPlaybackElement = new Audio(fileReader.result);
				this.audioPlaybackElement.volume = 0.8; // don't oversaturate speakers;
				this.tryPlayAudio(this.audioPlaybackElement);
			}.bind(this);
			fileReader.readAsDataURL(blob);
		}

        
    }
	/** calls play on an HTML audio element, takes care of promise */
	tryPlayAudio(audioElement) {
		try {
            let playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(function(){}).catch(function(error) {}); // eslint-disable-line no-unused-vars
            }
        } catch (e) {
            debugLog('could not play sound', e);
        }
	}
    getVolume() {

   		 // https://github.com/cwilso/volume-meter/blob/master/volume-meter.js

        if (this.isDisconnected) return 0;

        if (!this.audioProcessor && this.currentStream) {
            this.startAudioMeter();
        }

        if (this.audioProcessor) {
            return this.audioProcessor.volume;
        }
        return 0;
    }




    /** starts processing audio stream for mic volume
    https://github.com/cwilso/volume-meter/blob/master/volume-meter.js
    */
    startAudioMeter(clipLevel, averaging, clipLag) {

        if (!this.currentStream) {
            return; // no stream to monitor.
        }
        let audioContext = this.audioCtx;
        if (!this.mediaStreamSource) {
            this.mediaStreamSource = this.audioCtx.createMediaStreamSource(this.currentStream);
        }

        if (!this.audioProcessor) {
        
           // "It is recommended for authors to not specify this buffer size and allow the implementation to pick a good
    	   // buffer size to balance between latency and audio quality."
           // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor
            let processor = audioContext.createScriptProcessor((typeof AudioContext != 'undefined' ? null : 512), 1, 1);
            processor.onaudioprocess = this.processVolume.bind(this);
            processor.clipping = false;
            processor.lastClip = 0;
            processor.volume = 0;
            processor.clipLevel = clipLevel || 0.98;
            processor.averaging = averaging || 0.95;
            processor.clipLag = clipLag || 750;

            // this will have no effect, since we don't copy the input to the output,
            // but works around a current Chrome bug.
            processor.connect(audioContext.destination);

            processor.checkClipping = function(){

                if (!processor.clipping) {
                    return false;
                }
                if ((processor.lastClip + processor.clipLag) < window.performance.now()) {
                    processor.clipping = false;
                }
                return processor.clipping;
            };

            processor.shutdown = function(){
                processor.disconnect();
                processor.onaudioprocess = null;
            };

            this.audioProcessor = processor;

            this.mediaStreamSource.connect(this.audioProcessor);
        }


    }
    stopAudioMeter() {
        if (this.audioProcessor) {
            this.audioProcessor.shutdown();
            this.mediaStreamSource.disconnect(this.audioProcessor);
            this.audioProcessor = null;
        }

        this.mediaStreamSource = null;
    }


    /** Process volume using root mean square.
        @param {object} event from audioContext.createScriptProcessor.onaudioprocess
        @this {AudioProcessor} audioProcessor
    */
    processVolume(event) {

        let buf = event.inputBuffer.getChannelData(0);
        let bufLength = buf.length;
        let sum = 0;
        let x;


        // Average out the absolute values
        for (let i = 0; i < bufLength; i++) {
            x = buf[i];
            sum += Math.abs(x);
        }

        // ... then take the square root of the sum.
        let avg =  Math.sqrt(sum / bufLength);


        // divide by .5 because the max value seems to be around .5...
        // this needs to be improved as it is not accurate, but it's enough to show
        // a bit of a microphone level.
        this.audioProcessor.volume =  avg / 0.5;


        if (DEBUG_AUDIOMETER) debugLog('process volume:', buf, sum, avg, this.audioProcessor);
    }


} // AudioCapture

/** @class VideoCapture

This class opens a video stream using the webcam.
*/

class VideoCapture {
    constructor (videoElement) {
        // https://www.html5rocks.com/en/tutorials/getusermedia/intro/
        this.videoElement = videoElement || document.createElement('video');
		this.errorHandler = null;
    }


    getId() {

        if (!this.id) {
     // uuid generator
            this.id =  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
          });

        }
        return this.id;
    }
    startRecord(constraints) {
        constraints = constraints || { video: true, audio: false };
        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(constraints).then(
                                this.beginStartRecord.bind(this),
                                this.onError.bind(this));
        }
        return this.getId() + '.webm';
    }

    stopRecord() {
        try {
            if (this.currentStream) {

                let audioTracks = this.currentStream.getAudioTracks();
                if (audioTracks) {
                    for (let i = 0; i < audioTracks.length; i++) {
                        audioTracks[i].stop();
                    }
                }
                let videoTracks = this.currentStream.getVideoTracks();
                if (videoTracks) {
                    for (let i = 0; i < videoTracks.length; i++) {
                        videoTracks[i].stop();
                    }
                }
                this.videoElement.pause();

                this.videoElement.src = null;

            }
        } catch (e) {
           debugLog('could not close webcam');
        }
    }

    beginStartRecord(stream) {
		this.videoElement.src = window.URL.createObjectURL(stream);
        this.currentStream = stream;

		if (!this.isRecordingPermitted) {
			this.stopRecord();
			throw new Error('Recording video is not permitted.');
		}
        
		
    }

    onError(e) {
        debugLog(e);
        if (!this.inOnError) {
			try {
				this.inOnError = true;
				this.stopRecord();
			} finally {
				this.inOnError = false;
			}
			
        }
        
        if (this.errorHandler) {
        	this.errorHandler(e);
        }
    }


    /** takes a picture of the current video feed and returns a data: url in png format */
    snapshot(cameraRect, isMirrored) {

        if (!this.currentStream || !this.isRecordingPermitted) return null;


        // make a canvas to draw the current video frame to
        let canvas = document.createElement('canvas');

        // make the canvas the same size as the videoElement.
        let w = cameraRect.width;//this.videoElement.clientWidth;
        let h = cameraRect.height; //this.videoElement.clientHeight;

        canvas.width = w;
        canvas.height = h;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';


        // draw the video to the canvas, then convert to an image.
        let ctx = canvas.getContext('2d');

        if (isMirrored) {
            // mirror the context so that the image draws reversed too
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(this.videoElement, 0, 0, cameraRect.width, cameraRect.height);


     
        let data =  canvas.toDataURL('image/png');
        return data;

    }

}

class CameraPickerDialog {

    constructor(data) {
        this.shapeData = data;
        this.isMirrored = true;
    }


    show() {
        if (!this.cameraPickerDiv) {
            this.cameraPickerDiv = document.createElement('div');
            this.cameraPickerDiv.setAttribute('style', 'z-index:90000; position:absolute; top:0px, left:0px, width: 1000px; height: 1000px;');




            this.cameraPickerDiv.id = 'cameraPickerDiv';

            // the video has autoplay so that the feed will start when shown
            // it also has scale so that the camera will act as a mirror - otherwise
            // it can be awkward to get yourself into the frame.
            let videoStyle = '';
            if (this.isMirrored) {
                videoStyle = `style='-moz-transform: scale(-1, 1); -webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); transform: scale(-1, 1); filter: FlipH;'`;
            }
            this.cameraPickerDiv.innerHTML = `
               <video id='CameraPickerDialog-cameraFeed'` + videoStyle + ` autoplay></video>
               <img id='CameraPickerDialog-maskImg' src='` + this.shapeData.image + `'></img>
                                              `;

            document.getElementById('backdrop').appendChild(this.cameraPickerDiv);

            this.videoElement = document.getElementById('CameraPickerDialog-cameraFeed');
            this.maskImg = document.getElementById('CameraPickerDialog-maskImg');


            // Similar to ScratchJR.m openfeed
            // camera rect is just the small opening: x,y,width,height
            this.layoutDiv(this.videoElement, this.shapeData.x, this.shapeData.y, this.shapeData.width, this.shapeData.height);

            // maskImg is a workspace sized image to display over the camera so you can see the rest
            // of the drawing.  e.g. if you're only filling in the cat's head, this image
            // is everything (graph paper, cat body) but the cat's head.

            // maskedImg rect is: mx,my,mw,mh
            this.layoutDiv(this.maskImg, this.shapeData.mx, this.shapeData.my, this.shapeData.mw, this.shapeData.mh);


            this.videoCaptureElement = new VideoCapture(this.videoElement);
            this.videoCaptureElement.isRecordingPermitted = true;
            this.videoCaptureElement.startRecord({video: { width: this.shapeData.width, height: this.shapeData.height }});



        }

    }

    layoutDiv(el, x, y, w, h) {
        try {
            el.style.position = 'absolute';
            el.style.top = y + 'px';
            el.style.left = x + 'px';
            if (w) {
                el.style.width = w + 'px';
            }
            if (h) {
                el.style.height = h + 'px';
            }
        } catch (e) {
            debugLog('Cannot layout element', el, e);
        }
    }

    snapshot() {

        if (!this.videoCaptureElement) {
            debugLog('snapshot: no active video feed');
            return null;
        }

        // get the bounding rect of the shape within the video screen...
        let cameraRect = {x: 0,
                    y: 0,
                    width: this.shapeData.width,
                    height: this.shapeData.height };
        return  this.videoCaptureElement.snapshot(cameraRect, this.isMirrored);

    }
    hide() {
        if (this.videoCaptureElement) {
            this.videoCaptureElement.stopRecord();
            this.videoCaptureElement = null;

            this.cameraPickerDiv.remove();

            this.cameraPickerDiv = null;
            this.videoElement = null;
        }


    }
} // class CameraPickerDialog




window.tablet = new ElectronDesktopInterface();

import {preprocessAndLoadCss} from './src/utils/lib.js';
import Localization from './src/utils/Localization.js';
import AppUsage from './src/utils/AppUsage.js';
import iOS from './src/iPad/iOS.js';
import IO from './src/iPad/IO.js';
import MediaLib from './src/iPad/MediaLib.js';

import {indexMain} from './src/entry/index.js';
import {homeMain} from './src/entry/home.js';
import {editorMain} from './src/entry/editor.js';
import {gettingStartedMain} from './src/entry/gettingstarted.js';
import {inappInterfaceGuide, inappAbout, inappBlocksGuide, inappPaintEditorGuide} from './src/entry/inapp.js';

function loadSettings (settingsRoot, whenDone) {
	IO.requestFromServer(settingsRoot + 'settings.json', (result) => {
		window.Settings = JSON.parse(result);
		whenDone();
	});
}


// App-wide entry-point
window.onload = () => loadPage(window.scratchJrPage);



function loadPage(page) {
	// Function to be called after settings, locale strings, and Media Lib
	// are asynchronously loaded. This is overwritten per HTML page below.
	let entryFunction = () => {};

	// Root directory for includes. Needed in case we are in the inapp-help
	// directory (and root becomes '../')
	let root = './';

	
	// Load CSS and set root/entryFunction for all pages
	switch (page) {
	default:
	case 'index':
		// Index page (splash screen)
		preprocessAndLoadCss('css', 'css/font.css');
		preprocessAndLoadCss('css', 'css/base.css');
		preprocessAndLoadCss('css', 'css/start.css');
		preprocessAndLoadCss('css', 'css/thumbs.css');
		/* For parental gate. These CSS properties should be refactored */
		preprocessAndLoadCss('css', 'css/editor.css');
		entryFunction = () => iOS.waitForInterface(indexMain);
		break;
	case 'home':
		// Lobby pages
		preprocessAndLoadCss('css', 'css/font.css');
		preprocessAndLoadCss('css', 'css/base.css');
		preprocessAndLoadCss('css', 'css/lobby.css');
		preprocessAndLoadCss('css', 'css/thumbs.css');
		entryFunction = () => iOS.waitForInterface(homeMain);
		break;
	case 'editor':
		// Editor pages
		preprocessAndLoadCss('css', 'css/font.css');
		preprocessAndLoadCss('css', 'css/base.css');
		preprocessAndLoadCss('css', 'css/editor.css');
		preprocessAndLoadCss('css', 'css/editorleftpanel.css');
		preprocessAndLoadCss('css', 'css/editorstage.css');
		preprocessAndLoadCss('css', 'css/editormodal.css');
		preprocessAndLoadCss('css', 'css/librarymodal.css');
		preprocessAndLoadCss('css', 'css/paintlook.css');
		entryFunction = () => iOS.waitForInterface(editorMain);
		break;
	case 'gettingStarted':
		// Getting started video page
		preprocessAndLoadCss('css', 'css/font.css');
		preprocessAndLoadCss('css', 'css/base.css');
		preprocessAndLoadCss('css', 'css/gs.css');
		entryFunction = () => iOS.waitForInterface(gettingStartedMain);
		break;
	case 'inappAbout':
		// About ScratchJr in-app help frame
		preprocessAndLoadCss('style', 'inapp/style/about.css');
		entryFunction = () => inappAbout();
		//root = '../';
		break;
	case 'inappInterfaceGuide':
		// Interface guide in-app help frame
		preprocessAndLoadCss('style', 'inapp/style/interface.css');
		entryFunction = () => inappInterfaceGuide();
	//	  root = '../';
		break;
	case 'inappPaintEditorGuide':
		// Paint editor guide in-app help frame
		preprocessAndLoadCss('style', 'inapp/style/paint.css');
		entryFunction = () => inappPaintEditorGuide();
	//  root = '../';
		break;
	case 'inappBlocksGuide':
		// Blocks guide in-app help frame
		preprocessAndLoadCss('style', 'inapp/style/blocks.css');
		entryFunction = () => inappBlocksGuide();
    //	  root = '../';
		break;
	}

	// Start up sequence
	// Load settings from JSON
	loadSettings(root, () => {
		// Load locale strings from JSON
		Localization.includeLocales(root, () => {
			// Load Media Lib from JSON
			MediaLib.loadMediaLib(root, () => {
				entryFunction();
			});
		});
		// Initialize currentUsage data
		AppUsage.initUsage();
	});
}


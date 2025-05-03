/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/preload.ts":
/*!************************!*\
  !*** ./src/preload.ts ***!
  \************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\n// Expose protected methods that allow the renderer process to use\n// the ipcRenderer without exposing the entire object\nelectron_1.contextBridge.exposeInMainWorld('api', {\n    on: (channel, callback) => {\n        // Whitelist channels\n        const validChannels = [\n            'new-chat',\n            'chat-response',\n            'tool-call-update',\n            'audio-recording-started',\n            'audio-recording-stopped'\n        ];\n        if (validChannels.includes(channel)) {\n            const subscription = (_event, ...args) => callback(...args);\n            electron_1.ipcRenderer.on(channel, subscription);\n            // Return a function to remove the event listener\n            return () => {\n                electron_1.ipcRenderer.removeListener(channel, subscription);\n            };\n        }\n        return undefined;\n    },\n    // General app functions\n    askQuestion: (question) => electron_1.ipcRenderer.invoke('ask-question', question),\n    toggleWindowSize: () => electron_1.ipcRenderer.send('toggle-window-size'),\n    hideWindow: () => electron_1.ipcRenderer.send('hide-window'),\n    createNewChat: () => electron_1.ipcRenderer.send('create-new-chat'),\n    openMainChat: () => electron_1.ipcRenderer.send('open-main-chat'),\n    // Main chat window functions\n    sendChatMessage: (message) => electron_1.ipcRenderer.invoke('send-chat-message', message),\n    sendToolCallResponse: (response) => electron_1.ipcRenderer.invoke('send-tool-call-response', response),\n    // Audio-related functions\n    requestMicrophonePermission: () => electron_1.ipcRenderer.invoke('request-microphone-permission'),\n    getAudioDevices: () => electron_1.ipcRenderer.invoke('get-audio-devices'),\n    startAudioRecording: (deviceId) => electron_1.ipcRenderer.invoke('start-audio-recording', deviceId),\n    stopAudioRecording: () => electron_1.ipcRenderer.invoke('stop-audio-recording'),\n    // Toolbar recording functions\n    toggleRecordingFromExternal: () => electron_1.ipcRenderer.invoke('toggle-recording-from-external'),\n    getRecordingStatus: () => electron_1.ipcRenderer.invoke('get-recording-status')\n});\n\n\n//# sourceURL=webpack://agent-pal/./src/preload.ts?");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/preload.ts");
/******/ 	
/******/ })()
;
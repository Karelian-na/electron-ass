import { IpcEvents } from "electron-ass/common/events";

const appTitleEle = document.querySelector(".title-bar .title");
if (appTitleEle) {
	appTitleEle.textContent = window.app.getName();
}

const appEle = document.querySelector("#app-content .content");
if (appEle) {
	appEle.textContent = `${window.app.getName()} - ${window.app.getVersion()}`;
}

const resizeBtn = document.querySelector("#resizeBtn");
if (resizeBtn) {
	resizeBtn.addEventListener("click", () => {
		window.win.resize({ width: 800, height: 600 }, { animate: true });
	});
}

window.win.addEventListener(IpcEvents.windowBeforeClose, () => {
	window.alert("The window is about to close!");
	return true;
});

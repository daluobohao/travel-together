import {
	createSSRApp
} from "vue";
import App from "./App.vue";
import miniProgramShareMixin from "./mixins/miniProgramShare.js";
import acquisitionCaptureMixin from "./mixins/acquisitionCapture.js";

export function createApp() {
	const app = createSSRApp(App);
	app.mixin(miniProgramShareMixin);
	app.mixin(acquisitionCaptureMixin);
	return {
		app,
	};
}

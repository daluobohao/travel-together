import {
	createSSRApp
} from "vue";
import App from "./App.vue";
import miniProgramShareMixin from "./mixins/miniProgramShare.js";

export function createApp() {
	const app = createSSRApp(App);
	app.mixin(miniProgramShareMixin);
	return {
		app,
	};
}

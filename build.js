import { rollup } from "https://unpkg.com/rollup@2.39.0/dist/es/rollup.browser.js";
import { 
    functionMap as rollup_plugin_functionMap,
    globalFs as rollup_plugin_globalFs,
    fetchHttp as rollup_plugin_fetchHttp,
} from './rollupPlugins.js';

export function onwarn(warning) {
    console.group(warning.loc ? warning.loc.file : '');
    console.warn(warning.message);
    if (warning.frame) {
      console.log(warning.frame);
    }
    if (warning.url) {
      console.log("See " + warning.url + " for more information");
    }
    console.groupEnd();
};

export default async function build() {
    const rollupConfig = {
        input: "worker.js",
		plugins: [
            rollup_plugin_fetchHttp,
            rollup_plugin_globalFs,
        ],
        onwarn,
        output: {
            format: 'es',
        },
    };
    
    const bundle = await rollup(rollupConfig);
    const { output: [{ code }] } = await bundle.generate(rollupConfig.output);
    await bundle.close();
    
    return code;
}

export const preview = build;
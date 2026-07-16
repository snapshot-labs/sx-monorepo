import { isBrowser, isNode } from "browser-or-node";

declare global {
    interface Window {
        blst: any;
    }
}

export let getBlst: () => Promise<any>;

if (isBrowser) {
    getBlst = async () => {
        if (!window.blst) {
            const script = document.createElement('script');
            script.src = '/blst.js';

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error("Failed to load BLST"));
                document.head.appendChild(script);
            });

            if (!window.blst) {
                throw new Error("BLST failed to initialize after loading");
            }
        }
        return window.blst;
    };
} else if (isNode) {
    getBlst = () => import('./blst/blst').then(module => module.default);
} else {
    throw new Error("platform not supported.");
}
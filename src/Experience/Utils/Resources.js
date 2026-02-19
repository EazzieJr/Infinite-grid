import * as THREE from 'three'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import EventEmitter from "./EventEmitter";

export default class Resources extends EventEmitter {
	constructor(sources) {
		super()

		// Options
		this.sources = sources

		// Setup
		this.items = {}
		this.toLoad = this.sources.length
		this.loaded = 0

		this.setLoaders()
		this.startLoading()
	}

	setLoaders() {
		this.loaders = {}
		this.loaders.gltfLoader = new GLTFLoader()
		this.loaders.textureLoader = new THREE.TextureLoader()
		this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()
	}

	startLoading() {
		// Load Each Source
		for (const source of this.sources) {
			if (source.type === 'gltfModel') {
				this.loaders.gltfLoader.load(
					source.path,
					(file) => {
						this.sourceLoaded(source, file);
					}
				)
			} else if (source.type === 'texture') {
				if (Array.isArray(source.path)) {
					Promise.all(
						source.path.map(url =>
							new Promise(res =>
								this.loaders.textureLoader.load(url, t => res(t))
							)
						)
					).then(textures => {
						this.sourceLoaded(source, textures);
					});
				} else {
					this.loaders.textureLoader.load(
						source.path,
						file => this.sourceLoaded(source, file)
					);
				}
			} else if (source.type === 'cubeTexture') {
				this.loaders.cubeTextureLoader.load(
					source.path,
					(file) => {
						this.sourceLoaded(source, file);
					}
				)
			}
		}
	}

	sourceLoaded(source, file) {
		this.items[source.name] = file;
		this.loaded++;

		// 0 → 100 %
		const percent = Math.round((this.loaded / this.toLoad) * 100);

		console.log("Loaded: ", percent);
		this.trigger('progress', [percent]);   // NEW

		if (this.loaded === this.toLoad) {
			this.trigger('ready');
		}
	}
}